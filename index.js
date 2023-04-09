require("dotenv").config();
const { IgApiClient } = require('instagram-private-api');
const { Configuration, OpenAIApi } = require("openai");
const Jimp = require("jimp");
const fs = require("fs");
const cloudinary = require('cloudinary').v2;
const CronJob = require("cron").CronJob;
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/the-cyber-painter', (req, res) => {
  console.log('Server was pinged');
  res.send('I am The Cyber Painter');
})

const postToInsta = async () => {

    const configuration = new Configuration({
        apiKey: process.env.OPEN_AI_KEY,
      });
    const openai = new OpenAIApi(configuration);

    cloudinary.config({
        cloud_name: process.env.CLOUD_NAME,
        api_key: process.env.CLOUD_API_KEY,
        api_secret: process.env.CLOUD_API_SECRET
      });

    const completion = await openai.createChatCompletion({
        model: "gpt-4",
        max_tokens: 100,
        messages: [
          {
            role: 'user', 
            content: "Write prompt for AI image generator"
          }
        ],
    });

    const completion2 = await openai.createChatCompletion({
        model: "gpt-4",
        max_tokens: 50,
        top_p: 1.0,
        temperature: 0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stop: ["\"\"\""],
        messages: [{role: 'user', content: `Write me popular instagram hashtags for this sentence ${completion.data.choices[0].message.content}.`}],
    });

    const caption = completion.data.choices[0].message.content;
    const hashtags = completion2.data.choices[0].message.content;

    const image = await openai.createImage ({
        prompt: `${caption} hyper-realistic, ultra resolution, detailed --ar 4:5`,
        n: 1,
        size: "512x512"
    })

    const imageURl = image.data.data[0].url;

    console.log(caption);
    console.log(imageURl);

    Jimp.read(imageURl).then((lenna) => {
        return lenna
        .resize(1024, 1024, Jimp.RESIZE_NEAREST_NEIGHBOR)
        .quality(100)
        .write("./image.jpeg")
    });

    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    console.log('Login successful!');

    await cloudinary.uploader.upload("./image.jpeg", 
        {public_id: new Date()},
        ).then((data) => {
        console.log(data);
      }).catch((err) => {
        console.log(err);
      });

    const imageFile = fs.readFileSync("./image.jpeg");

    await ig.publish.photo({
        file: imageFile,
        caption: `${caption}${hashtags}`,
    });
    console.log("Image posted");

    fs.unlinkSync("./image.jpeg");
    console.log("Image deleted");
}

const cronInsta = new CronJob("0 20 * * *", async () => {
  postToInsta();
});


cronInsta.start();