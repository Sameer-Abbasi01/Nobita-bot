module.exports = {
  config: {
    name: "music",
    version: "1.0",
    role: 0,
    author: "Shikaki, Modified By Priyanshi Kaur",
    cooldowns: 4,
    shortDescription: "Play Song / Download By Name Or Link",
    category: "Music",
    usages: "(.sing Sing Name) (.sing Yt Song URL)",
    dependencies: {
      "fs-extra": "",
      "request": "",
      "axios": "",
      "ytdl-core": "",
      "yt-search": ""
    }
  },

  onStart: async ({ api, event }) => {
    const axios = require("axios");
    const fs = require("fs-extra");
    const ytdl = require("ytdl-core");
    const yts = require("yt-search");

    const input = event.body;
    const data = input.split(" ");

    if (data.length < 2) {
      return api.sendMessage("Please write music name", event.threadID);
    }

    data.shift();
    const song = data.join(" ");

    try {
      api.sendMessage(`🌐 | Searching Lyrics and Music for "${song}".\n♻ | Please Wait...🖤`, event.threadID);

      // Fetch lyrics and song details
      const lyricsResponse = await axios.get(`https://globalapis.onrender.com/api/lyrics?songName=${encodeURIComponent(song)}`);
      const lyrics = lyricsResponse.data.lyrics || "Not found!";
      const title = lyricsResponse.data.title || "Not found!";
      const artist = lyricsResponse.data.artist || "Not found!";
      const songImage = lyricsResponse.data.image || "";

      // Fetch song details from vmam-docs
      const songResponse = await axios.get(`https://vmam-docs.onrender.com/vmam/apis?yt=${encodeURIComponent(song)}&type=song`);
      const songUrl = songResponse.data.url;

      if (!songUrl) {
        return api.sendMessage("Error: Song not found.", event.threadID, event.messageID);
      }

      // Download the song
      const stream = ytdl(songUrl, { filter: "audioonly" });
      const fileName = `${event.senderID}.mp3`;
      const filePath = __dirname + `/cache/${fileName}`;
      stream.pipe(fs.createWriteStream(filePath));

      stream.on('response', () => {
        console.info('[DOWNLOADER]', 'Starting download now!');
      });

      stream.on('info', (info) => {
        console.info('[DOWNLOADER]', `Downloading ${info.videoDetails.title} by ${info.videoDetails.author.name}`);
      });

      stream.on('end', async () => {
        console.info('[DOWNLOADER] Downloaded');

        if (fs.statSync(filePath).size > 26214400) {
          fs.unlinkSync(filePath);
          return api.sendMessage('[ERR] The file could not be sent because it is larger than 25MB.', event.threadID);
        }

        // Send message with lyrics, artist, title, song image, and audio
        const message = {
          body: `🪩Title: ${title}\n🎩Artist: ${artist}\n\n🧾Lyrics: ${lyrics}`,
          attachment: [fs.createReadStream(filePath)]
        };

        if (songImage) {
          const imgStream = await axios.get(songImage, { responseType: 'stream' });
          const imgPath = __dirname + `/cache/${event.senderID}.jpg`;
          imgStream.data.pipe(fs.createWriteStream(imgPath)).on('close', () => {
            message.attachment.push(fs.createReadStream(imgPath));
            api.sendMessage(message, event.threadID, () => {
              fs.unlinkSync(filePath);
              fs.unlinkSync(imgPath);
            });
          });
        } else {
          api.sendMessage(message, event.threadID, () => {
            fs.unlinkSync(filePath);
          });
        }
      });

    } catch (error) {
      console.error('[ERROR]', error);
      api.sendMessage('Please try again later. An error occurred.', event.threadID);
    }
  }
};
