// Import required modules
const Microphone = require("node-microphone");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const readline = require("readline");
const axios = require("axios");
const FormData = require("form-data");
const Speaker = require("speaker");
const OpenAI = require("openai");
require("dotenv").config();

// Set the path for FFmpeg, used for audio processing
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize OpenAI API client with the provided API key
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: apiKey,
});

// Variables to store chat history and other components
let chatHistory = []; // To store the conversation history
let microphone, outputFile, microphoneStream, readlineInterface; // Microphone, output file, microphone stream, and readline interface

console.log(
  `\nVIRTUAL ASSISTANT\n`
);

// Function to set up the readline interface for user input
const setupReadlineInterface = () => {
  readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true, // Make sure the terminal can capture keypress events
  });

  readline.emitKeypressEvents(process.stdin, readlineInterface);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  // Handle keypress events
  process.stdin.on("keypress", (str, key) => {
    if (
      key &&
      (key.name.toLowerCase() === "return" ||
        key.name.toLowerCase() === "enter")
    ) {
      if (microphoneStream) {
        stopRecordingAndProcess();
      } else {
        startRecording();
      }
    } else if (key && key.ctrl && key.name === "c") {
      process.exit(); // Handle ctrl+c for exiting
    } else if (key) {
      console.log("Exiting application...");
      process.exit(0);
    }
  });

  console.log("Press Enter when you're ready to start speaking.");
};

// Function to start recording audio from the microphone
const startRecording = () => {
  microphone = new Microphone();
  outputFile = fs.createWriteStream("output.wav");
  microphoneStream = microphone.startRecording();

  // Write incoming data to the output file
  microphoneStream.on("data", (data) => {
    outputFile.write(data);
  });

  // Handle microphone errors
  microphoneStream.on("error", (error) => {
    console.error("Error: ", error);
  });

  console.log("Recording... Press Enter to stop");
};

// Function to stop recording and process the audio
const stopRecordingAndProcess = () => {
  microphone.stopRecording();
  outputFile.end();
  console.log(`Recording stopped, processing audio...`);
  transcribeAndChat(); // Transcribe the audio and initiate chat
};

// Default voice setting for text-to-speech
const defaultVoice = "nova"; // https://platform.openai.com/docs/guides/text-to-speech/voice-options
const defaultModel = "tts-1-hd"; // https://platform.openai.com/docs/guides/text-to-speech/audio-quality

// Function to convert text to speech and play it using Speaker
async function playTextAsSpeech(
  text,
  model = defaultModel,
  voice = defaultVoice
) {
  const url = "https://api.openai.com/v1/audio/speech";
  const headers = {
    Authorization: `Bearer ${apiKey}`, // API key for authentication
  };

  const data = {
    model: model,
    input: text,
    voice: voice,
    response_format: "mp3",
  };

  try {
    // Make a POST request to the OpenAI audio API
    const response = await axios.post(url, data, {
      headers: headers,
      responseType: "stream",
    });

    // Configure speaker settings
    const speaker = new Speaker({
      channels: 2, // Stereo audio
      bitDepth: 16,
      sampleRate: 44100,
    });

    // Convert the response to the desired audio format and play it
    ffmpeg(response.data)
      .toFormat("s16le")
      .audioChannels(2)
      .audioFrequency(44100)
      .pipe(speaker);
  } catch (error) {
    // Handle errors from the API or the audio processing
    if (error.response) {
      console.error(
        `Error with HTTP request: ${error.response.status} - ${error.response.statusText}`
      );
    } else {
      console.error(`Error in playTextAsSpeech: ${error.message}`);
    }
  }
}

// Function to transcribe audio to text and send it to the chatbot
async function transcribeAndChat() {
  const filePath = "output.wav";
  // note that the file size limitations are 25MB for Whisper

  // Prepare form data for the transcription request
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("model", "whisper-1");
  form.append("response_format", "text");

  try {
    // Post the audio file to OpenAI for transcription
    const transcriptionResponse = await axios.post(
      "https://api.openai.com/v1/audio/transcriptions",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    // Extract transcribed text from the response
    const transcribedText = transcriptionResponse.data;
    console.log(`>> You said: ${transcribedText}`);

    // Check if the transcribed text contains keywords related to date and time
    if (transcribedText.toLowerCase().includes("date") || transcribedText.toLowerCase().includes("time")) {
      const currentDateTime = new Date().toLocaleString();
      console.log(`>> Assistant said: The current date and time is ${currentDateTime}`);
      await playTextAsSpeech(`The current date and time is ${currentDateTime}`);
    } else {
      // Prepare messages for the chatbot, including the transcribed text
      const messages = [
        {
          role: "system",
          content:
            "You are a helpful assistant providing concise responses in at most two sentences.",
        },
        ...chatHistory,
        { role: "user", content: transcribedText },
      ];

      // Send messages to the chatbot and get the response
      const chatResponse = await openai.chat.completions.create({
        messages: messages,
        model: "gpt-3.5-turbo",
      });

      // Extract the chat response.
      const chatResponseText = chatResponse.choices[0].message.content;

      // Update chat history with the latest interaction
      chatHistory.push(
        { role: "user", content: transcribedText },
        { role: "assistant", content: chatResponseText }
      );

      // Convert the chat response to speech and play + log it to the terminal
      await playTextAsSpeech(chatResponseText);
      console.log(`>> Assistant said: ${chatResponseText}`);
    }

    // Reset microphone stream and prompt for new recording
    microphoneStream = null;
    console.log("Press Enter to speak again, or any other key to quit.\n");
  } catch (error) {
    // Handle errors from the transcription or chatbot API
    if (error.response) {
      console.error(
        `Error: ${error.response.status} - ${error.response.statusText}`
      );
    } else {
      console.error("Error:", error.message);
    }
  }
}

// Initialize the readline interface
setupReadlineInterface();