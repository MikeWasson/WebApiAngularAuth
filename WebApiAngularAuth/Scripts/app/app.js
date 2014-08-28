﻿var myApp = angular.module('myApp', ['ui.router']);


// Add an event handler for 401 responses
myApp.run(['$rootScope', '$state', function ($rootScope, $state) {
    $rootScope.$on('event:unauthorized', function () {
        $state.go('login');
    });
}]);


myApp.factory('tokenStore', function () {

    var tokenKey = 'accessToken';

    return {
        setToken: function (access_token) {
            sessionStorage.setItem(tokenKey, access_token);
        },
        getToken: function () {
            return sessionStorage.getItem(tokenKey);
        },
        removeToken: function () {
            sessionStorage.removeItem(tokenKey);
        }
    };
});



myApp.factory('httpInterceptor', ['$q', '$rootScope', 'tokenStore', function ($q, $rootScope, tokenStore) {
    return {
        // Add Authorization header to requests if we have a bearer token.
        'request': function (config) {
            var token = tokenStore.getToken();
            if (token) {
                config.headers['Authorization'] = 'Bearer ' + token;
            };
            return config;
        },
        // Send global event on 401
        'responseError': function (rejection) {
            switch (rejection.status) {
                case 401:
                    console.log('Got 401');
                    $rootScope.$emit('event:unauthorized');
                    break;
            }

            return $q.reject(rejection);
        }
    };
}]);

myApp.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push('httpInterceptor');
}]);


// Services

myApp.factory('ValuesService', ['$http', '$rootScope', '$state', function ($http, $rootScope, $state) {

    var url = 'api/values';

    return {
        getValues: function () {
            return $http.get(url);
        }
    };
}]);


myApp.factory('AccountService', ['$http', '$rootScope', '$state', 'tokenStore', function ($http, $rootScope, $state, tokenStore) {

    var accountUrl = 'api/Account';
    var tokenUrl = '/Token';

    return {
        getuserinfo: function () {
            return $http.get(accountUrl + '/UserInfo');
        },

        login: function (data) {
            var body = 'grant_type=password&username=' + data.Email + '&password=' + data.password;
            return $http({
                method: 'POST',
                url: tokenUrl,
                data: body,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
            }).then(function (response) {
                tokenStore.setToken(response.data.access_token);
            });
        },

        logout: function () {
            tokenStore.removeToken();
            return $http.post(accountUrl + '/Logout');      // only for cookie based auth?
        },

        register: function (data) {
            return $http.post(accountUrl + '/Register', data);
        }
    };
}]);



// Set up controllers

myApp.controller('DemoController', ['$scope', 'ValuesService', function ($scope, ValuesService) {
    ValuesService.getValues().success(function (data) {
        $scope.values = data;
    });
}]);

myApp.controller('LoginController', ['$scope', '$state', 'AccountService', function ($scope, $state, AccountService) {
    $scope.user = {};
    $scope.login = function () {
        AccountService.login($scope.user).then(function () {
            $state.go('home');
        });
    };
}]);

myApp.controller('RegisterUserController', ['$scope', '$state', 'AccountService', function ($scope, $state, AccountService) {
    $scope.user = {};
    $scope.register = function () {
        AccountService.register($scope.user).then(function () {
            AccountService.login($scope.user).then(function (data) {
                $state.go('home');
            })
        });
    };
}]);



// Set up states

myApp.config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

    $urlRouterProvider.otherwise('/home');

    $stateProvider

        .state('home', {
            url: '/home',
            templateUrl: 'Templates/home.html',
            controller: 'DemoController'
        })

        .state('login', {
//            url: '/login',
            templateUrl: 'Templates/login.html',
            controller: 'LoginController'
        })

        .state('logout', {
            url: '/logout',
            resolve:  {
                AccountService: 'AccountService'
            },
            onEnter: function (AccountService) {
                AccountService.logout();
            },
            controller: function($state) {
                $state.go('home');
            }
        })

        .state('register', {
            templateUrl: 'Templates/register.html',
            controller: 'RegisterUserController'
        });
}]);


