'use strict';

function validateGovernanceLearning(gl = {}) {
  return {
    valid: gl.auto_mutation_applied === false && gl.supervised === true,
    learning_active: gl.learning_active === true
  };
}

module.exports = { validateGovernanceLearning };
