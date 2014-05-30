'use strict';

function MainCtrl($scope, $http, $routeParams, $location) {
    $scope.params = $location.search();
    $scope.datasets = DVID.datasets;
}

