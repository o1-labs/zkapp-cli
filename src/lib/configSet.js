const fs = require('fs-extra');
const { green, red } = require('chalk');
const { configRead, projRoot } = require('./helpers');

// config set existing alias property
async function configSet({ alias, prop, value }) {
  const config = await configRead();

  // deploy alias must exist to change a value
  const aliases = Object.keys(config.deployAliases);
  if (!aliases.includes(alias)) {
    console.error(red(`Invalid deploy alias: ${alias}`));
    console.log('Available deploy aliases:', aliases);
    return;
  }

  // all aliases have the same properties, we just need one
  // property must be valid
  const props = Object.keys(config.deployAliases[aliases[0]]);
  if (!props.includes(prop)) {
    console.error(red(`Invalid property: ${prop}`));
    console.log('Available properties:', props);
    return;
  }

  // TODO validation of the value given the property

  // set value and overwrite config file
  config.deployAliases[alias][prop] = value;
  fs.writeJSONSync(`${await projRoot()}/config.json`, config, { spaces: 2 });
  console.log(
    green(`Alias '${alias}' property '${prop}' successfully set to '${value}'`)
  );
}

module.exports = {
  configSet,
};
