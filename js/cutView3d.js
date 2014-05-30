/**
  * @author DocSavage / http://github.com/DocSavage
  * @author Bill Katz
  */

// See https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame

(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

DVID.CutView3D = function(params, width, height, orientation3d, stats) {

    this.params = params;
	this.stats = stats;
    this.width = width;
    this.height = height;
    //this.planeSize = 250;
    this.viewRadius = 250;
    this.center = new THREE.Vector3(3150.0/2.0, 2599.0/2.0, (8009.0-1490.0)/2.0);
    this.resolution = new THREE.Vector3(10.0, 10.0, 10.0);

    this.orientation3d = orientation3d;

    this.camera = new THREE.PerspectiveCamera(20, width / height, 1, this.viewRadius * 100);
    this.camera.position = new THREE.Vector3(400, 800, 4000);
    this.camera.matrixAutoUpdate = true;

    this.scene = new THREE.Scene();
    this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0x060606));

    this.light = new THREE.DirectionalLight(0xffffff, DVID.dataset.directionalLight);
    this.light.castShadow = true;
    this.directionalLight = 1.0;

    this.camera.add(this.light);
    this.light.position.set(0,0,2000);
    this.light.target = this.camera;

    // Add picking support.
    this.hit = {
        selected: false,
        plane: null,
        offset: new THREE.Vector3(),
        object: {}
    };

    this.hit.plane = new THREE.Mesh(
        new THREE.PlaneGeometry( 20000, 20000 ),
        new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true, wireframe: true } )
    );
    this.hit.plane.visible = false;
    this.scene.add( this.hit.plane );

    this.projector = new THREE.Projector();

    // Setup the renderer.
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.sortObjects = false;
    this.renderer.setSize(width, height);
    this.renderer.shadowMapEnabled = true;

    // Setup the trackball.
    this.trackball = new THREE.TrackballControls(this.camera, this.renderer.domElement, this.orientation3d);
    this.trackball.rotateSpeed = 1.0;
    this.trackball.zoomSpeed = 1.2;
    this.trackball.panSpeed = 0.8;
    this.trackball.noZoom = false;
    this.trackball.noPan = false;
    this.trackball.staticMoving = true;
    this.trackball.dynamicDampingFactor = 0.3;
    //this.trackball.target.copy(DVID.dataset.center);

    // Keep track of mouse.
    this.mouse = new THREE.Vector2();

	this.bodyAlpha = 1.0;
    this.sparseVolumeColor = '#10ffff';
    
    var xhr = new XMLHttpRequest();
    var url = DVID.surfaceByLabelUrl(params.uuid, params.dataname, params.body);
    console.log("Calling ", url);
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    var origObj = this;
    xhr.onload = function(e) {
        var arrayBuffer = xhr.response;
        console.log("Got back: ", xhr);
        if (arrayBuffer) {
            origObj.addSurface(arrayBuffer, '#10ffff');
        }
    };
    xhr.send();
};

DVID.CutView3D.prototype = {

    constructor: DVID.CutView3D,

    render: function() {
        this.trackball.update();
        this.renderer.render(this.scene, this.camera);
        //this.orientation3d.notifyChange(this.camera);
    },

    animate: function() {
        var render = this.render;
        var requestAnimationFrame = window.requestAnimationFrame;
        var origObj = this;  // 'this' could change meaning on repeated animate(), so use closure.
        function animateFrame() {
            requestAnimationFrame(animateFrame);
            origObj.render();
			origObj.stats.update();
        }
        animateFrame();
    },

    getDomElement: function() {
        return this.renderer.domElement;
    },

    resize: function(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    },

    // Returns true if we are moving something.
    mouseDown: function() {
        if (!this.showPlanes) {
            this.hit.object = null;
            return false;
        }

        var vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        this.projector.unprojectVector(vector, this.camera);

        if (this.pickBodies) {
            this.selectSurface(this.camera.position, vector.sub(this.camera.position).normalize());
        } else {
            this.planeSelect(this.camera.position, vector.sub(this.camera.position).normalize());
            if (this.hit.selected) {
                this.trackball.enabled = false;
                return true;
            }
        }
        return false;
    },

    mouseUp: function() {
        this.trackball.enabled = true;
    },

    // Returns true if mouse now hovers over a selectable object.
    mouseMove: function(x, y) {
        // Translate client coords into viewport x,y
        this.mouse.x = ( x / this.width ) * 2 - 1;
        this.mouse.y = - ( y / this.height ) * 2 + 1;

        var vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        this.projector.unprojectVector(vector, this.camera);

        var origin = this.camera.position;
        var direction = vector.sub(this.camera.position).normalize();
        return false;
    },

    // Handle arrow keys for moving center.
    keyDown: function(keyCode) {
        var delta = 4;
        switch (keyCode) {
            case 37: // left
                this.center.x -= delta;
                if (this.center.x < this.minPt.x) {
                    this.center.x = this.minPt.x;
                }
                break;
            case 39: // right
                this.center.x += delta;
                if (this.center.x > this.maxPt.x) {
                    this.center.x = this.maxPt.x;
                }
                break;
            case 38: // up
                this.center.z -= delta;
                if (this.center.z < this.minPt.z) {
                    this.center.z = this.minPt.z;
                }
                break;
            case 40: // down
                this.center.z += delta;
                if (this.center.z > this.maxPt.z) {
                    this.center.z = this.maxPt.z;
                }
                break;
        }
        this.changedCenter();
    },

    // Rotate into scene view.
    applyCamera: function(vec) {
        var out = new THREE.Vector3(vec.x, vec.y, vec.z);
        // TODO -- make sure euler angle order is XYZ or put in switch
        var mat = new THREE.Matrix4();
        mat.extractRotation(this.camera.matrixWorld);
        out.applyMatrix4(mat);
        return out;
    },

    centerMoveByDelta: function(delta) {
        if (delta.length() < 3.0) {
            return;
        }
        this.center.add(delta);
        this.changedCenter();
    },

    changedCenter: function() {
        if (this.orientation3d !== undefined) {
            this.orientation3d.notifyCenterChange(this.center);
        }
        //console.log("Center ", this.center);
    },

    deleteSparseVolume: function() {
        if (this.particles) {
            if (this.showBodies) {
                this.scene.remove(this.particles);
            }
            delete this.particles;
        }
    },

    addSurface: function(arrayBuffer, color) {
        var uintArray = new Uint32Array(arrayBuffer);
		var numVoxels = uintArray[0]		
        console.log("addSurface with", numVoxels, "voxels in surface of color", color, "; center = ", this.center);

		var farrayLength = numVoxels * 3
        var vertices = new Float32Array(arrayBuffer, 4, farrayLength);
		var normals = new Float32Array(arrayBuffer, 4 + farrayLength * 4, farrayLength)

        var geom = new THREE.BufferGeometry();
		geom.attributes = {
			position: {
				itemSize: 3,
				array: vertices,
				numItems: numVoxels * 3
			},
			normal: {
				itemSize: 3,
				array: normals,
				numItems: numVoxels * 3
			}
		};
		//var positions = geom.attributes.position.array;
        geom.computeBoundingSphere();
        geom.computeBoundingBox();

        // Compute the center
        this.center = geom.boundingBox.min;
        this.center.add(geom.boundingBox.max);
        this.center.divideScalar(2.0);
        console.log("Center:", this.center.x, this.center.y, this.center.z);
		var resX = this.resolution.getComponent(0);
		var resY = this.resolution.getComponent(1);
		var resZ = this.resolution.getComponent(2);
		var minRes = Math.min(resX, resY, resZ)
		var maxRes = Math.max(resX, resY, resZ)
		var size = 3.0; //maxRes / minRes;
		var anisotropy = this.resolution.divideScalar(minRes);
        var uniforms = {
            uSplatSize:    { type: "f", value: size },
            uColor:   { type: "c", value: new THREE.Color(color) },
            uBodyAlpha:   { type: "f", value: 1.0 }, //this.bodyAlpha },
            uAmbient: { type: "f", value: 0.3 },
            uDiffuse: { type: "f", value: 0.7 },
            uSpecular: { type: "f", value: 0.3 },
            uShininess: { type: "f", value: 32.0 },
			uCenter:  { type: "v3", value: this.center },
			uAnisotropy: { type: "v3", value: anisotropy },
            uLight1: { type: "v3", value: new THREE.Vector3(0.0, 0.0, 1000.0) }
        };
        var material = new THREE.ShaderMaterial({
            uniforms:       uniforms,
            vertexShader:   document.getElementById('surface-vertexshader').textContent,
            fragmentShader: document.getElementById('surface-fragmentshader').textContent
        });
        this.deleteSparseVolume();
        this.particles = new THREE.ParticleSystem(geom, material);
        this.scene.add(this.particles);
        this.showBodies = true;
    },

    // Returns intersection objects sorted from closest to farthest
    cutPlaneIntersection: function(origin, direction) {
        var raycaster = new THREE.Raycaster(origin, direction);
        var objects = [];
        objects.push(this.planes.xy);
        objects.push(this.planes.xz);
        objects.push(this.planes.yz);
        return raycaster.intersectObjects(objects);
    },

    selectSurface: function(origin, direction) {
        if (!this.pickBodies) {
            return;
        }
        var intersects = this.cutPlaneIntersection(origin, direction);
        if (intersects.length < 1) {
            return;
        }
        var voxelHit = new THREE.Vector3();
        voxelHit.addVectors(intersects[0].point, this.center);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', DVID.surfaceByCoordUrl(DVID.dataset.labelmapName, voxelHit), true);
        xhr.responseType = 'arraybuffer';

        var origObj = this;
        xhr.onload = function(e) {
            var arrayBuffer = xhr.response;
            if (arrayBuffer) {
                origObj.addSurface(arrayBuffer, origObj.sparseVolumeColor);
            }
        };
        xhr.onerror = function(e) {
            console.log("XHR error: ", e)
        }
        xhr.send();
   },

    getVectorFromArray: function(obj) {
        if (obj[0] === undefined || obj[1] === undefined || obj[2] === undefined) {
            console.log("Illegal getVector on", obj);
            return new THREE.Vector3();
        }
        return new THREE.Vector3(obj[0], obj[1], obj[2]);
    },
};