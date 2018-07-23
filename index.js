// mqtt thermostat

'use strict';

var Service, Characteristic
var mqtt = require("mqtt");

module.exports = function(homebridge) {
      Service = homebridge.hap.Service;
      Characteristic = homebridge.hap.Characteristic;
      homebridge.registerAccessory("homebridge-mqtt-nestthermostat", "mqtt-nestthermostat", mqttnestthermostatAccessory);
}

function mqttnestthermostatAccessory(log, config) {
  this.log          = log;
  this.name         = config["name"];
  this.url          = config["url"];
  this.caption                    = config["caption"];
  this.topics                     = config["topics"];
  this.TargetTemperature          = 21;
  this.TargetHeatingCoolingState  = 3;
  this.CurrentHeatingCoolingState = 0;
  this.CurrentTemperature         = 22;
  this.CurrentRelativeHumidity    = 0;
  this.TemperatureDisplayUnits    = 0;

  this.client_Id    = 'mqttjs_' + Math.random().toString(16).substr(2, 8);
  this.options      = {
      keepalive: 10,
      clientId: this.client_Id,
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
           topic: 'WillMsg',
           payload: 'Connection Closed abnormally..!',
           qos: 0,
           retain: false
      },
      username: config["username"],
      password: config["password"],
      rejectUnauthorized: false
  };

  this.service = new Service.Thermostat(this.name);

  this.service.getCharacteristic(Characteristic.TargetTemperature)
    .setProps({
        maxValue: 25,
        minValue: 15,
        minStep: 1
    })
    .on('set', this.setTargetTemperature.bind(this))
    .on('get', this.getTargetTemperature.bind(this));

  this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('set', this.setTargetHeatingCoolingState.bind(this))
    .on('get', this.getTargetHeatingCoolingState.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
        maxValue: 40,
        minValue: 0,
        minStep: 0.01
    })
    .on('get', this.getCurrentTemperature.bind(this));

  this.service.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', this.getTemperatureDisplayUnits.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .setProps({
        maxValue: 100,
        minValue: 0,
        minStep: 0.01
    })
    .on('get', this.getCurrentRelativeHumidity.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', this.getCurrentHeatingCoolingState.bind(this));

  // connect to MQTT broker
  this.client = mqtt.connect(this.url, this.options);
  var that = this;
  this.client.on('error', function (err) {
      that.log('Error event on MQTT:', err);
  });

  // Log status messages
  this.client.on('message', function (topic, message) {
    if (topic == that.topics.get + 'api') {
        var status = JSON.parse(message);

        that.log(status)

        that.TargetHeatingCoolingState  = status["TargetHeatingCoolingState"];
        that.CurrentTemperature         = status["CurrentTemperature"];
        that.CurrentRelativeHumidity    = status["CurrentRelativeHumidity"];
        that.TargetTemperature          = status["TargetTemperature"];
        that.CurrentHeatingCoolingState = status["CurrentHeatingCoolingState"];

        that.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(that.TargetHeatingCoolingState, undefined, 'fromSetValue');
        that.service.getCharacteristic(Characteristic.TargetTemperature).setValue(that.TargetTemperature, undefined, 'fromSetValue');
        that.service.getCharacteristic(Characteristic.CurrentTemperature).setValue(that.CurrentTemperature, undefined, 'fromSetValue');
        that.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).setValue(that.CurrentRelativeHumidity, undefined, 'fromSetValue');
        that.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).setValue(that.CurrentHeatingCoolingState, undefined, 'fromSetValue');
    }
  });
  this.client.subscribe(this.topics.get + '#');
}

   // MQTT messages
mqttnestthermostatAccessory.prototype.setTargetHeatingCoolingState = function(TargetHeatingCoolingState, callback, context) {
    if(context !== 'fromSetValue') {
      this.TargetHeatingCoolingState = TargetHeatingCoolingState;
      this.client.publish(this.topics.set + 'setTargetHeatingCoolingState', String(this.TargetHeatingCoolingState), this.options_publish);
    }
    callback();
}

mqttnestthermostatAccessory.prototype.setTargetTemperature = function(TargetTemperature, callback, context) {
    if(context !== 'fromSetValue') {
      this.TargetTemperature = TargetTemperature;
      this.client.publish(this.topics.set + 'setTargetTemperature', String(this.TargetTemperature), this.options_publish);
    }
    callback();
}

mqttnestthermostatAccessory.prototype.getTargetHeatingCoolingState = function(callback) {
    callback(null, this.TargetHeatingCoolingState);
}

mqttnestthermostatAccessory.prototype.getTargetTemperature = function(callback) {
    callback(null, this.TargetTemperature);
}

mqttnestthermostatAccessory.prototype.getCurrentTemperature = function(callback) {
    callback(null, this.CurrentTemperature);
}

mqttnestthermostatAccessory.prototype.getTemperatureDisplayUnits = function(callback) {
    callback(null, this.TemperatureDisplayUnits);
}

mqttnestthermostatAccessory.prototype.getCurrentRelativeHumidity = function(callback) {
    callback(null, this.CurrentRelativeHumidity);
}

mqttnestthermostatAccessory.prototype.getCurrentHeatingCoolingState = function(callback) {
    callback(null, this.CurrentHeatingCoolingState);
}

mqttnestthermostatAccessory.prototype.getServices = function() {
  return [this.service];
}
