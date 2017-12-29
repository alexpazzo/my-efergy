'use strict'
const puppeteer = require('puppeteer');
const mqtt = require('mqtt');

//check mqttServer process env
let server;
if (!process.env.SERVER || process.env.SERVER == "") {
    throw new Error("Missing SERVER or is a empty string, check you process env");
} else {
    server = process.env.SERVER
}

//check process env username password
let username, password = null;
if ((!process.env.USERNAME || process.env.USERNAME == "") || (!process.env.PASSWORD || process.env.PASSWORD == "")) {
    throw new Error("Missing USERNAME or PASSWORD, check you process env");
} else {
    username = process.env.USERNAME;
    password = process.env.PASSWORD;
}

/**
 * Connection to MQTT
 */
const client = mqtt.connect(`mqtt://${server}`);
//Callback on connection
client.on('connect', setup);


let browser;
// fired when the mqtt server is ready
function setup() {
    console.log(`'Connected to the mqtt://${server} server`);
    getEfergy();
}

let getEfergy = (async() => {
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    console.log(`https://engage.efergy.com/user/login?username=${username}&password=${password}`);
    await page.goto(`https://engage.efergy.com/user/login?username=${username}&password=${password}`);

    page.on('response', async response => {
        if (response.url.match(/getCurrentValuesSummary/)) {
            let data = await response.json();
            var message = {
                topic: 'efergy/currentValues/',
                payload: JSON.stringify(data), // or a Buffer
                qos: 0, // 0, 1, or 2
                retain: false // or true
            };
            client.publish(message.topic, message.payload);

        }

    })
})

const CronJob = require('cron').CronJob;
const job = new CronJob('0 */12 * * *', function() {
        console.log("Restarting Puppeteer");
        if (browser) browser.close();
        if (getEfergy) getEfergy();
    }, function() {

    },
    true,
    "Europe/Rome"
);