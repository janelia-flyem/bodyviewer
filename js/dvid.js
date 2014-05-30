
Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var DVID = {
    REVISION: '1',

    // Loaded on initialization of MainCtrl controller.
    datasets: {},
    uuids: [],  // List of root node UUIDs for each dataset.

    // Currently selected dataset for visualization
    dataset: {
        // For currently selected dataset, what are the available voxels data names?
        availVoxels: [],

        // For currently selected dataset, what are the available labels data names?
        availLabels: [],

        // For current selected dataset, what are the available labelmaps?
        availLabelmaps: [],

        uuid: "",          // UUID (string) for current dataset
        imageName: "",     // data name for current image intensities
        labelName: "",     // data name for label information
        labelmapName: "",  // data name for labelmap
        labelID: "0"       // unsigned 64-bit label to display body (0 = no display)
    },


    changeDataImage: function(dataset, dataname) {
        console.log("changeDataImage: ", dataset, dataname);
        var data = dataset.DataMap[dataname];
        if (data !== undefined) {
            var minPt = new THREE.Vector3(data.MinPoint[0], data.MinPoint[1], data.MinPoint[2]);
            var maxPt = new THREE.Vector3(data.MaxPoint[0], data.MaxPoint[1], data.MaxPoint[2]);
            this.dataset.minPt = minPt;
            this.dataset.maxPt = maxPt;
			
			this.dataset.resolution = new THREE.Vector3(data.VoxelSize[0], data.VoxelSize[1], data.VoxelSize[2]);
			
            this.dataset.center = new THREE.Vector3();
            this.dataset.center.addVectors(minPt, maxPt);
            this.dataset.center.divideScalar(2);
            console.log("changeDataImage center is now: ", this.dataset.center);
        }
    },

    // Load texture.
    loadTexture: function(url) {
        var mapping = new THREE.UVMapping();
        var texture;
        texture = THREE.ImageUtils.loadTexture(url, mapping, function() {
                texture.flipY = true;
            },
            function() {
                console.log('Error in trying GET', url);
            });
        return texture;
    },

    // Returns a URL to access a slice
    voxelsUrl: function(dataname, uuid, sliceType, center, offset, viewRadius) {
        var sizeStr = Math.round(viewRadius * 2) + '_' + Math.round(viewRadius * 2);
        var pos = offset[sliceType].position.clone();
        var name = dataname;
        //console.log("Get URL: slice", sliceType, ":", pos, "  center:", center);
        switch (sliceType) {
            case 'xy':
                pos.x -= viewRadius;
                pos.y -= viewRadius;
                break;
            case 'xz':
                pos.x -= viewRadius;
                pos.z -= viewRadius;
                break;
            case 'yz':
                pos.y -= viewRadius;
                pos.z -= viewRadius;
                break;
        }
        pos.add(center);

        // Make sure this is within current dataset bounds.

        var offsetStr = Math.round(pos.x) + '_' + Math.round(pos.y) + '_' + Math.round(pos.z);
        var url = '/api/node/' + uuid + '/' + name + '/raw/' + sliceType + '/' + sizeStr + '/' + offsetStr;
        return url;
    },

    // Returns a URL to retrieve a subvolume given a coordinate.
    surfaceByLabelUrl: function(uuid, dataname, label) {
        return '/api/node/' + uuid + '/' + dataname + '/surface/' + label;
    },

    // Returns a URL to retrieve a subvolume given a coordinate.
    surfaceByCoordUrl: function(dataname, pt) {
        var coord = Math.round(pt.x) + '_' + Math.round(pt.y) + '_' + Math.round(pt.z);
        return '/api/node/' + this.dataset.uuid + '/' + 'groundtruth' + '/surface-by-point/' + coord;
    },

    // Returns a URL to retrieve a subvolume given a coordinate.
    sparseVolByLabelUrl: function(dataname, label) {
        return '/api/node/' + this.dataset.uuid + '/' + 'neurons' + '/sparsevol/' + label;
    },

    // Returns a URL to retrieve a subvolume given a coordinate.
    sparseVolByCoordUrl: function(dataname, pt) {
        var coord = Math.round(pt.x) + '_' + Math.round(pt.y) + '_' + Math.round(pt.z);
        return '/api/node/' + this.dataset.uuid + '/' + 'neurons' + '/sparsevol-by-point/' + coord;
    },

    // Returns a URL to retrieve a swc file for the given bodyid assuming it's been saved in
    // a 'skeletons' keyvalue data in DVID with .swc ending.
    swcUrl: function(bodyid) {
        var swcfile = bodyid + '.swc';
        return '/api/node/' + this.dataset.uuid + '/skeletons/' + swcfile;
    },

    /*
    ravToGlPt: function(ravPt) {
        return new THREE.Vector3(ravPt[0], DVID.view3d.maxPt.y - ravPt[1], ravPt[2] - DVID.view3d.zsliceAdjust);
    },
    */
};