const { database: { core: { serverConfig } } } = require("../../../app");

const pageHeader = async (content) => {
    return (
        `<html>
        <head>
        <title>${serverConfig.name}</title>
        <link rel="stylesheet" id="style" href="style.css" type="text/css" media="all">
        <style>
        h2{font-size:16px;padding:3px 0 0 10px;margin:0;} 
        h3{font-size:14px;padding:3px 0 0 15px;margin:0;} 
        p{font-size:12px;padding:3px 0 0 25px;margin:0;} 
        body{color:#fff;background:#000} table{border-bottom:1px solid #aaa;} 
        .right{text-align:right;}
        </style>
        </head>
        <body>` +
        content +
        "</body></html>"
    );
}
/**
 * Renders the home page????
 * @returns 
 */
module.exports.renderHomePage = async () => {
    let html = "";
    html += `<div class="container">
      <div class="row">
          <div class="twelve columns">
              <h1>Version: ${serverConfig.serverVersion}</h1>
        <h1>Node: ${serverConfig.name}</h1>
        <h2>Why are you here.</h2>
          </div>
      </div>
      </div>`;
    html += `</div>`;
    html = await pageHeader(html); // adds header and footer + some stypes etc.
    return html;
};