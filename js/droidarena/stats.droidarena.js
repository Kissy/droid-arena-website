var BASE_URL = "http://api-droid-arena.kissy.fr/";
//BASE_URL = "http://localhost:8080/";

var droidarena = angular.module('droidarena', []);

/**
 * Route config.
 */
droidarena.config(['$routeProvider', function($routeProvider) {
    $routeProvider.
        when('/', {templateUrl: 'tpl/round-list.html',   controller: RoundListCtrl}).
        when('/:roundId', {templateUrl: 'tpl/round-details.html', controller: RoundDetailsCtrl}).
        when('/:roundId/:playerId', {templateUrl: 'tpl/round-history.html', controller: RoundHistoryCtrl}).
        otherwise({redirectTo: '/'});
}]);

/**
 * Rounds data service.
 */
droidarena.factory('roundsDataService', function() {
    return {
        pagination: 0,
        data: []
    };
});

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
 * Filter an order command and display the human readable command.
 */
droidarena.filter('commandIdToString', function() {
    return function(input) {
        switch (input) {
            case 1:
                return "PLUS";
            case 2:
                return "MINUS";
            case 3:
                return "OPPOSITE";
            case 4:
                return "DOUBLE";
            default:
                return "NONE";
        }
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
 * Round List controller.
 * Handle the list of previous rounds.
 *
 * @type {Array} The list of injection.
 */
var RoundListCtrl = ['$scope', '$http', 'roundsDataService',
function RoundListCtrl($scope, $http, roundsDataService) {
    $scope.rounds = roundsDataService.data;
    $scope.roundsLoading = $scope.rounds.length == 0;
    $scope.displayShowMore = !$scope.roundsLoading;

    $scope.showDetails = function(round) {
        $scope.round = round;
        $('body').addClass('modal-open');
        $('#roundDetailsModal').css("display", "block");
    };

    $scope.fetchRounds = function() {
        $scope.roundsLoading = true;
        $http.get(BASE_URL + 'rounds/' + roundsDataService.pagination).success(function(data) {
            $scope.rounds.push.apply($scope.rounds, data.r);
            $scope.roundsLoading = false;
            $scope.displayShowMore = data.r.length == 10;
            // Copy the rounds to data service
            roundsDataService.data = $scope.rounds;
        });
    };

    $scope.showMore = function() {
        roundsDataService.pagination += 10;
        $scope.fetchRounds();
    };

    // Only fetch if the rounds are not already loaded
    if ($scope.roundsLoading) {
        $scope.fetchRounds();
    }
}];

/**
 * Round Details controller.
 * Handle the list of players for given round.
 *
 * @type {Array} The list of injection.
 */
var RoundDetailsCtrl = ['$scope', '$location', '$routeParams', 'roundsDataService',
function RoundListCtrl($scope, $location, $routeParams, roundsDataService) {
    var round = roundsDataService.data[$routeParams.roundId];
    if (!round) {
        $location.path("/");
        return;
    }
    $scope.subTitle = round._id.$oid;
    $scope.roundId = $routeParams.roundId;
    $scope.players = round.p;
}];

/**
 * Round History controller.
 * Handle the history for given round & player.
 *
 * @type {Array} The list of injection.
 */
var RoundHistoryCtrl = ['$scope', '$location', '$routeParams', 'roundsDataService',
    function RoundListCtrl($scope, $location, $routeParams, roundsDataService) {
        var round = roundsDataService.data[$routeParams.roundId];
        if (!round) {
            $location.path("/");
            return;
        }
        var player = round.p[$routeParams.playerId];
        if (!player) {
            $location.path("/");
            return;
        }
        $scope.subTitle = player.n;
        $scope.roundId = $routeParams.roundId;
        $scope.playerId = $routeParams.playerId;
        $scope.history = player.h;
    }];

