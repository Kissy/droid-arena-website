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

var droidarena = angular.module('droidarena', []);

/**
 * Format a number to a as minute & seconds.
 *
 * @return {String} The number & minute seconds as string.
 */
function toMinutesSeconds(number) {
    if (isNaN(number)) {
        return "";
    }
    var seconds = number % 60;
    var minutes = (number - seconds) / 60;
    return (minutes < 10 ? '0': '') + minutes + ":" + (seconds < 10 ? '0': '') + seconds;
};


/**
 * Get the local timer normalized.
 *
 * @return {Number} The local timer normalized.
 */
function getLocalTimerNormalized() {
    return Math.floor(new Date().getTime() / 1000) * 1000;
}

/**
 * Normalized the update counter.
 *
 * @param newValue The new value for the update counter.
 * @return {Number} The normalized value for the update counter.
 */
function normalizedUpdateCounter(newValue) {
    if ((newValue / 1000) % 2 != 0) {
        newValue += 1000;
    }
    return newValue;
}

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

    $scope.localTimer = 0;
    $scope.serverOffset = 0;

    $scope.updateCounter = 0;
    $scope.roundCounter = 0;

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
            $scope.localTimer = getLocalTimerNormalized();
            $scope.serverOffset = $scope.localTimer - Math.floor(data.c / 1000) * 1000;
            $scope.updateCounter = normalizedUpdateCounter($scope.localTimer - $scope.serverOffset);
            $scope.roundCounter = data.r;
            $scope.timeSynchronized = true;
        });
    };

    var removeTimeSynchronizedWatch = $scope.$watch('timeSynchronized', function(newValue, oldValue) {
        if (newValue) {
            removeTimeSynchronizedWatch();
            $timeout($scope.scheduleNextStep, 1000 + $scope.localTimer - new Date().getTime());
        }
    });

    // Launch the first round.
    $scope.scheduleNextRound();
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
                if ($scope.loading) {
                    $element.removeClass('half-rotate');
                    return;
                }

                var counter = $scope.updateCounter - newValue + $scope.serverOffset;
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
                if ($scope.loading) {
                    $element.rotate(360);
                    return;
                }

                var oldCounter = oldValue - $scope.serverOffset - $scope.updateCounter;
                var newCounter = newValue - $scope.serverOffset - $scope.updateCounter;
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

                        var counter = $scope.roundCounter - newValue + $scope.serverOffset;
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
                        var counter = $scope.roundCounter - newValue + $scope.serverOffset;
                        $element.html(toMinutesSeconds(Math.ceil(counter / 1000)));
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
                        var oldCounter = $scope.roundCounter - oldValue + $scope.serverOffset;
                        var newCounter = $scope.roundCounter - newValue + $scope.serverOffset;
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
 * Player controller.
 * Handle the list of players update.
 *
 * @type {Array} The list of injection.
 */
var PlayerListCtrl = ['$scope', '$http', '$timeout', function PlayerListCtrl($scope, $http, $timeout) {
    $scope.players = [];
    $scope.playersLoading = true;

    $scope.refreshPlayers = function() {
        $scope.players = [];
        $scope.playersLoading = true;
        $http.get(BASE_URL + 'list').success(function(data) {
            $scope.players = data.p;
            $scope.playersLoading = false;
        });
    };

    $scope.refreshPlayers();
    $scope.$watch('localTimer', function(newValue, oldValue) {
        if (((newValue - $scope.serverOffset) / 1000) % 2 == 1) {
            $timeout($scope.refreshPlayers, 500);
        }
    });
}];

