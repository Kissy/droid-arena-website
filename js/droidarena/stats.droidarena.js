var BASE_URL = "http://api-droid-arena.kissy.fr/";
//BASE_URL = "http://localhost:8080/";

var droidarena = angular.module('droidarena', []);

/**
 * Filter an object ID and extract the created time.
 */
droidarena.filter('objectIdToTime', function() {
    return function(input) {
        if (!input) {
            return "-";
        }
        return parseInt(input.substring(0, 8), 16) * 1000 - 540000;
    }
});

/**
 * Close the opened modal.
 */
droidarena.directive('closeRoundDetails', function () {
    return function ($scope, $element, $attributes) {
        angular.element($element).bind("click", function () {
            $('#roundDetailsModal').css("display", "none");
            $('body').removeClass('modal-open');
        });
    };
});

/**
 * Round controller.
 * Handle the list of previous rounds.
 *
 * @type {Array} The list of injection.
 */
var RoundListCtrl = ['$scope', '$http', '$timeout', function RoundListCtrl($scope, $http, $timeout) {
    var pagination = 0;

    $scope.rounds = [];
    $scope.roundsLoading = true;
    $scope.displayShowMore = false;

    $scope.showDetails = function(round) {
        $scope.round = round;
        $('body').addClass('modal-open');
        $('#roundDetailsModal').css("display", "block");
    };

    $scope.fetchRounds = function() {
        $scope.roundsLoading = true;
        $http.get(BASE_URL + 'rounds/' + pagination).success(function(data) {
            $scope.rounds.push.apply($scope.rounds, data.r);
            $scope.roundsLoading = false;
            $scope.displayShowMore = data.r.length == 10;
        });
    };

    $scope.showMore = function() {
        pagination += 10;
        $scope.fetchRounds();
    };

    $scope.fetchRounds();
}];

