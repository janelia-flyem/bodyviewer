
var dvidApp = angular.module('dvidApp', ['ngRoute']);
/*
dvidApp.factory('dvidServer', function($http) {
    return {
        sparseVolByCoord: function(dataname, voxelHit) {
            return $http.get(DVID.sparseVolUrl(dataname, voxelHit)).then(function(result) {
                return result.data;
            });
        }
    }
});
*/
dvidApp.filter('stringsize', function() {
    var stringsizeFilter = function(input, size) {
        return input.slice(0, size-1);
    };
    return stringsizeFilter;
});

dvidApp.directive('control3d', function() {
    var linkFn;
    linkFn = function(scope, element) {
        scope.init = function() {
            var controlarea = angular.element(element);

            var gui = new dat.GUI({ autoPlace: false });
            controlarea.append(gui.domElement);

            // Surface Options
            var view_folder = gui.addFolder("View Options");

 			var h_alpha = view_folder.add(DVID.cutView3d, 'bodyAlpha', 0.0, 1.0).step(0.01);
            var h_bodyColor = view_folder.addColor(DVID.cutView3d, 'sparseVolumeColor');
            var h_directionalLight = view_folder.add(DVID.cutView3d, 'directionalLight', 0.2, 2.0).step(0.05);

			
			h_alpha.onChange(function(value) {
                console.log("alpha:", value, "particles in 3d cut view: ", DVID.cutView3d.particles);
                console.log("test:", DVID.cutView3d.particles.material.uniforms);
                DVID.cutView3d.scene.remove(DVID.cutView3d.particles);
                DVID.cutView3d.particles.material.uniforms.uBodyAlpha = { type: "f", value: value };
                DVID.cutView3d.scene.add(DVID.cutView3d.particles);
			});
            h_directionalLight.onChange(function(value) {
                DVID.cutView3d.light.intensity = value;
            });
        };
        scope.init();
    };
    return {
        restrict: 'E',
        link: linkFn
    };
});

dvidApp.directive('orientation3d', function() {
    var linkFn;
    linkFn = function(scope, element) {

        var renderarea = angular.element(element);
        var renderwidth = 200;
        var renderheight = 200;

        var container = document.createElement( 'div' );
        renderarea.append( container );

        scope.init = function() {
            DVID.orientation3d = new DVID.Orientation3D(500, renderwidth, renderheight);
            var domElement = DVID.orientation3d.getDomElement();
            container.appendChild(domElement);

            window.addEventListener( 'resize', onWindowResize, false );

            DVID.orientation3d.animate();

            DVID.orientation3d.refresh('xy');
            DVID.orientation3d.refresh('xz');
            DVID.orientation3d.refresh('yz');
        }
		scope.init();

        function onWindowResize() {
            DVID.orientation3d.resize(renderwidth, renderheight);
        }
    };
    return {
        restrict: 'E',
        link: linkFn
    };
});

dvidApp.directive('browser3d', function() {
    var linkFn;
    linkFn = function(scope, element) {

        var container, tileview;
        var renderarea = angular.element(element);
        var renderwidth = window.innerWidth - 300;
        var renderheight = window.innerHeight;
        if (renderwidth > 1000) {
            renderwidth = 1000;
        }
        if (renderheight > 800) {
            renderheight = 800;
        }

        init();

        function init() {
            container = document.createElement( 'div' );
            renderarea.append( container );

			// Add the stats window.
			var stats = new Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			container.appendChild(stats.domElement);

			// Add the cutView3d window.
            DVID.cutView3d = new DVID.CutView3D(scope.params, renderwidth, renderheight, DVID.orientation3d, stats);
            var domElement = DVID.cutView3d.getDomElement();
            container.appendChild(domElement);

            domElement.addEventListener('mousemove', onDocumentMouseMove, false);
            domElement.addEventListener('mousedown', onDocumentMouseDown, false);
            domElement.addEventListener('mouseup', onDocumentMouseUp, false);

            window.addEventListener('keydown', onDocumentKeyDown, false);

            window.addEventListener( 'resize', onWindowResize, false );

            DVID.cutView3d.animate();
        }

        function onWindowResize() {
            DVID.cutView3d.resize(renderwidth, renderheight);
        }

        function onDocumentKeyDown( event ) {
            event.preventDefault();
            DVID.cutView3d.keyDown(event.keyCode);
        }

        function onDocumentMouseMove( event ) {
            //console.log("Mouse Move: selected", DVID.cutView3d.hit.selected, ", trackball enabled", DVID.cutView3d.trackball.enabled);
            event.preventDefault();

            var x = event.clientX - container.offsetLeft + window.pageXOffset;
            var y = event.clientY - container.offsetTop + window.pageYOffset;

            var selectable = DVID.cutView3d.mouseMove(x, y);
            if (selectable) {
                container.style.cursor = 'pointer';
            } else {
                container.style.cursor = 'auto';
            }
        }

        function onDocumentMouseDown( event ) {
            //console.log("Mouse Down: selected", DVID.cutView3d.hit.selected, ", trackball enabled", DVID.cutView3d.trackball.enabled);
            event.preventDefault();
            if (DVID.cutView3d.mouseDown()) {
                container.style.cursor = 'move';
            }
        }

        function onDocumentMouseUp( event ) {
            //console.log("Mouse Up: selected", DVID.cutView3d.hit.selected, ", trackball enabled", DVID.cutView3d.trackball.enabled);
            event.preventDefault();
            DVID.cutView3d.mouseUp();
            container.style.cursor = 'auto';
        }
    };
    return {
        restrict: 'E',
        link: linkFn
    };
});
