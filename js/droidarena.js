var BASE_URL = "http://api-droid-arena.kissy.fr/";
//BASE_URL = "http://localhost:8080/";

var BIG_LOADER_SETTINGS = {
    width: 100,
    height: 50,
    padding: 5,
    stepsPerFrame: 2,
    trailLength: 1,
    pointDistance: .03,
    strokeColor: '#3A87AD',
    step: 'fader',
    multiplier: 2,
    setup: function() {
        this._.lineWidth = 2;
    },
    path: [
        ['arc', 10, 10, 10, -270, -90],
        ['bezier', 10, 0, 40, 20, 20, 0, 30, 20],
        ['arc', 40, 10, 10, 90, -90],
        ['bezier', 40, 0, 10, 20, 30, 0, 20, 20]
    ]
};

prettyPrint();

var droidarena = angular.module('droidarena', []);

Number.prototype.toMinutesSeconds = function() {
    if (isNaN(this)) {
        return "";
    }
    var seconds = this % 60;
    var minutes = (this - seconds) / 60;
    return (minutes < 10 ? '0': '') + minutes + ":" + (seconds < 10 ? '0': '') + seconds;
};

/**
 * Main controller.
 * Start the scheduler for the round & step.
 */
droidarena.controller('play', function($scope, $http, $timeout) {
    $scope.updateTimer = 2000;
    $scope.roundTimer = 540000;

    $scope.loading = true;
    $scope.roundRunning = false;
    $scope.timeSynchronized = false;

    $scope.localTimer = Math.floor(new Date().getTime() / 1000) * 1000;
    $scope.serverOffset = 0;

    $scope.updateCounter = $scope.localTimer;
    $scope.roundCounter = 0;

    if (($scope.updateCounter / 1000) % 2 != 0) {
        $scope.updateCounter += 1000;
    }

    console.log($scope.updateCounter + " " + new Date($scope.updateCounter));

    /**
     * Get the time with the offset from the server.
     *
     * @return {Number}
     */
    $scope.getTime = function() {
        return $scope.localTimer - $scope.serverOffset;
    };

    /**
     * Schedule the next step.
     */
    $scope.scheduleNextStep = function() {
        $scope.localTimer += 1000;
        var now = $scope.getTime();

        if ($scope.timeSynchronized) {
            $scope.loading = false;
            $scope.timeSynchronized = false;
        }

        if (!$scope.loading) {
            $scope.roundRunning = new Date(now).getMinutes() % 10 != 9;
        }

        if (now >= $scope.updateCounter) {
            $scope.updateCounter += $scope.updateTimer;
        }

        if (now >= $scope.roundCounter) {
            $scope.scheduleNextRound();
        }

        // Schedule for next second
        $timeout(arguments.callee, 1000 + $scope.localTimer - new Date().getTime());
    };

    /**
     * Schedule the next round.
     * First request the time data from the server.
     */
    $scope.scheduleNextRound = function() {
        $http.get(BASE_URL + 'time').success(function(data) {
            $scope.serverOffset = $scope.localTimer - Math.floor(data.c / 1000) * 1000;
            $scope.roundCounter = data.r;
            $scope.timeSynchronized = true;
        });
    };

    // Launch the first round.
    $scope.scheduleNextRound();
    $timeout($scope.scheduleNextStep, 1000 + $scope.localTimer - new Date().getTime());
});

/**
 * Update timer directive.
 * Display the step update timer.
 */
droidarena.directive('updateTimer', function() {
    return {
        restrict: 'C',
        controller: function() {
            // Nothing, controller is needed to sub directives
        },
        link: function postLink($scope, $element) {
            $scope.$watch('localTimer', function(newValue, oldValue) {
                var counter = $scope.updateCounter - newValue;
                if (counter == $scope.updateTimer) {
                    $element.removeClass('half-rotate');
                } else if (counter == $scope.updateTimer / 2) {
                    $element.addClass('half-rotate');
                }
            });
        }
    };
});

/**
 * Update timer rotate directive, linked to update timer directive.
 */
droidarena.directive('updateTimerRotate', function() {
    return {
        require: '^updateTimer',
        restrict: 'C',
        link: function postLink($scope, $element, $attributes, $timer) {
            $scope.$watch('localTimer', function(newValue, oldValue) {
                var oldCounter = oldValue - $scope.updateCounter;
                var newCounter = newValue - $scope.updateCounter;
                var angle = 360 * (oldCounter / $scope.updateTimer);
                var newAngle = 360 * (newCounter / $scope.updateTimer);
                $element.rotate({ duration: 250, angle: angle, animateTo: newAngle});
            });
        }
    };
});

/**
 * Round timer directive.
 * Display the step round timer.
 */
droidarena.directive('roundTimer', function() {
    return {
        restrict: 'C',
        controller: function() {
            // Nothing, controller is needed to sub directives
        },
        link: function postLink($scope, $element) {
            var stopRoundTimer = function () {};
            $scope.$watch('roundRunning', function (newValue, oldValue) {
                if (newValue) {
                    stopRoundTimer = $scope.$watch('localTimer', function (newValue, oldValue) {
                        if ($scope.roundCounter == 0) {
                            return;
                        }

                        var counter = $scope.roundCounter - newValue;
                        if (counter >= $scope.roundTimer / 2) {
                            $element.removeClass('half-rotate');
                        } else {
                            $element.addClass('half-rotate');
                        }
                    });
                } else {
                    stopRoundTimer();
                    $element.removeClass('half-rotate');
                }
            });
        }
    };
});

/**
 * Round timer display directive, linked to round timer directive.
 */
droidarena.directive('roundTimerDisplay', function() {
    return {
        require: '^roundTimer',
        restrict: 'C',
        link: function postLink($scope, $element, $attributes, $timer) {
            var stopRoundTimer = function () {};
            $scope.$watch('roundRunning', function(newValue, oldValue) {
                if (newValue) {
                    stopRoundTimer = $scope.$watch('localTimer', function(newValue, oldValue) {
                        var counter = $scope.roundCounter - newValue;
                        $element.html(Math.ceil(counter / 1000).toMinutesSeconds());
                    });
                } else {
                    stopRoundTimer();
                    $element.html("-");
                }
            });
        }
    };
});

/**
 * Round timer rotate directive, linked to round timer directive.
 */
droidarena.directive('roundTimerRotate', function() {
    return {
        require: '^roundTimer',
        restrict: 'C',
        link: function postLink($scope, $element, $attributes, $timer) {
            var stopRoundTimer = function () {};
            $scope.$watch('roundRunning', function(newValue, oldValue) {
                if (newValue) {
                    stopRoundTimer = $scope.$watch('localTimer', function(newValue, oldValue) {
                        var oldCounter = $scope.roundCounter - oldValue;
                        var newCounter = $scope.roundCounter - newValue;
                        var angle = 360 * (oldCounter / $scope.roundTimer);
                        var newAngle = 360 * (newCounter / $scope.roundTimer);
                        $element.rotate({ duration: 250, angle: angle, animateTo: newAngle});
                    });
                } else {
                    stopRoundTimer();
                    $element.rotate(360);
                }
            });
        }
    };
});

/**
 * Sonic Loader directive.
 */
droidarena.directive('sonicLoader', function() {
    return {
        restrict: 'C',
        link: function postLink($scope, $element, $attributes, $timer) {
            var bigLoader = new Sonic(BIG_LOADER_SETTINGS);
            bigLoader.play();
            $element.html(bigLoader.canvas);
        }
    };
});

/**
 * Player controller.
 * Handle the list of players update.
 *
 * @type {Array} The list of injection.
 */
var PlayerListCtrl = ['$scope', '$http', '$timeout', function PlayerListCtrl($scope, $http, $timeout) {
    $scope.refreshPlayers = function() {
        $http.get(BASE_URL + 'list').success(function(data) {
            $scope.players = data.p;
        });
    };

    $scope.refreshPlayers();
    $scope.$watch('localTimer', function(newValue, oldValue) {
        if ((newValue / 1000) % 2 == 1) {
            $timeout($scope.refreshPlayers, 500);
        }
    });
}];
