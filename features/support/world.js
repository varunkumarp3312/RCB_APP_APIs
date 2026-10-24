const { setWorldConstructor } = require('@cucumber/cucumber');

class ApiWorld {
  constructor() {
    this.requestResult = null;
  }
}

setWorldConstructor(ApiWorld);
