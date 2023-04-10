// Importing file system module
//:TODO: Figure out and implement a soft=restart methoid.
process.removeAllListeners('warning');
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { webinterface } from '../../app.mjs';

const configPath = './assets/database/configs/config.json';
let config = JSON.parse(readFileSync(configPath));
let configsaved = JSON.parse(readFileSync(configPath));

// Configuring the pages to be rendered
const RENDER_PAGES = {
  CONFIG: '/account/config.html',
};

const RENDER_MESSAGES = {
  ERROR: 'An error has occurred. Check server log for more info.',
  SUCCESS: 'Config successfully updated. Please restart server.',
};

// ConfigController class to create and render configuration elements
export class ConfigController {
  /**
   * Register a new entry to the ConfigController
   * @param {*} groupName What group its put into, eg account, or fleamarket, 
   * @param {*} id unique ID of the config entry. MAKE SURE IT'S UNIQUE.
   * @param {*} title name of the config
   * @param {*} type checkbox, number, string
   * @param {*} initialValue The initial state of the config. (Checkbox: true/false, number: a number, string: a string.)
   * @returns config.json entry
   */
  static async registerNewConfigEntry(groupName, id, title, type, initialValue) {
    // Generating a unique ID for the element
    let input;

    //Simple load config 
    if (configsaved?.[groupName]?.[id]?.value != initialValue && configsaved?.[groupName]?.[id]?.value != undefined) {
      initialValue = configsaved?.[groupName]?.[id]?.value
    }
    else if (configsaved?.[groupName]?.[id] === null || configsaved?.[groupName]?.[id] === undefined) {
    }

    switch (type) {
      case 'checkbox':
        input = `<label for="${id}" style="color: white">${title}</label>
                 <input type="checkbox" name="${id}" title="${title}" id="${id}" ${initialValue ? 'checked' : ''}>`;
        break;
      case 'number':
        input = `<label for="${id}" style="color: white">${title}</label>
                 <input type="number" name="${id}" id="${id}" title="${title}" value="${initialValue}">`;
        break;
      case 'string':
      default:
        input = `<label for="${id}" style="color: white">${title}</label>
                 <input type="text" name="${id}" title="${title}" id="${id}" value="${initialValue}">`;
    }
    if (!config[groupName]) {
      config[groupName] = {};
    }
    
    if (!(id in config[groupName])) {
      config[groupName][id] = {
        title: title,
        value: initialValue,
        type: type
      };
      writeFileSync(configPath, JSON.stringify(config));
    }

    return { html: input };
  }

  static async generateConfigElements() {
    //:TODO: Remove previously used configs, that are no longer used anymore to prevent clogging
    let configHtml = `
      <div class="config-container">
    `;
    for (const [groupName, group] of Object.entries(configsaved)) {
      configHtml += `
        <div class="config-group">
          <div class="group-name" style="color:white; font-size:22px; text-decoration: underline; cursor: pointer;" onclick="toggleGroup(event)">
            ${groupName}
            <span class="arrow-indicator">&#9660;</span>
          </div>
          <div class="config-group-items" style="display:none;">`;
  
      for (const [id, { type, value, title }] of Object.entries(group)) {
        // Checking the type and setting it to the correct value
        if (type !== 'number' && type !== 'string' && type !== 'checkbox') {
          continue;
        }
  
        // Creating the configuration element and adding it to the HTML
        const configElement = await this.registerNewConfigEntry(groupName, id, title, type, value);
        configHtml += `
          <div class="config-item">
            ${configElement.html}
          </div>
        `;
      }
  
      configHtml += `
          </div> <!-- close the config-group-items div -->
        </div> <!-- close the config-group div -->
      `;
    }
  
    configHtml += `
      </div> <!-- close the config-container div -->
      <script>
        function toggleGroup(event) {
          const group = event.currentTarget.parentElement;
          const groupItems = group.querySelector('.config-group-items');
          const arrowIndicator = group.querySelector('.arrow-indicator');
          if (groupItems.style.display === 'none') {
            groupItems.style.display = 'block';
            arrowIndicator.innerHTML = '&#9650;';
          } else {
            groupItems.style.display = 'none';
            arrowIndicator.innerHTML = '&#9660;';
          }
        }
      </script>
      <style>
        .config-item {
          display: block;
          margin-bottom: 10px;
        }
      </style>
    `;
  
    return configHtml;
  }

  static async generateConfigGroupHtml(groupName) {
    let groupHtml = '';
    for (const [id, { type, value, title }] of Object.entries(configsaved[groupName])) {
      // Checking the type and setting it to the correct value
      if (type !== 'number' && type !== 'string' && type !== 'checkbox') {
        continue;
      }

      // Creating the configuration element and adding it to the HTML
      const configElement = await this.registerNewConfigEntry(groupName, id, title, type, value);
      groupHtml += configElement.html;
    }

    return groupHtml;
  }

  // Function to render the configuration page
  static async Config(request, reply) {
    // Setting the content type of the response to HTML
    reply.type('text/html');

    // Generating the HTML for the configuration elements
    const configHtml = await this.generateConfigElements();

    // Setting the variables to be used on the page
    const pageVariables = {
      configHtml: configHtml
    };

    // Rendering the page with the generated HTML and variables
    return webinterface.renderPage(RENDER_PAGES.CONFIG, pageVariables);
  }
  static async getValue(group, id) {
    return configsaved[group][id].value;
  }
  static async Update(request, reply) {
    reply.type("text/html");
    for (const groupName in configsaved) { // loop through all groups
      for (const id in configsaved[groupName]) { // loop through all config elements in the group
        const title = configsaved[groupName][id].title;
        const type = configsaved[groupName][id].type;
        const newValue = request.body[id];
        let parsedValue;
        if (type === 'checkbox') {
          // If the config element is a checkbox, its value is 'on' if checked, or undefined if not
          parsedValue = newValue === 'on' ? true : false;
        } else {
          try {
            parsedValue = JSON.parse(newValue);
          } catch (e) {
            console.log(e);
            return RENDER_MESSAGES.ERROR;
          }
        }

        // Update the value of the config element in the configsaved object
        configsaved[groupName][id].value = parsedValue;

        // Update the value of the config element in the config.json file
        const configPath = './assets/database/configs/config.json';
        let config = {};

        if (existsSync(configPath)) {
          config = JSON.parse(readFileSync(configPath));
        }

        if (!(groupName in config)) {
          config[groupName] = {};
        }

        config[groupName][id] = {
          title: title,
          type: type,
          value: parsedValue
        };

        writeFileSync(configPath, JSON.stringify(config));
      }
    }
    return RENDER_MESSAGES.SUCCESS;
  }
}