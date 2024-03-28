# Virtual-Assistant
TTS Chatbot using OpenAI's Whisper module

Overview

This Virtual Assistant is a simple implementation that allows users to interact with it through speech input and receive responses in both text and speech formats. It utilizes OpenAI's APIs for natural language processing and text-to-speech conversion.

Features

- Record audio input from the microphone.
- Transcribe the recorded audio into text.
- Interact with users through a conversational interface.
- Provide responses in both text and speech formats.

Setup

1. Clone this repository to your local machine.
2. Install the required dependencies by running npm install.
3. Set up your environment variables by creating a .env file with the following content:

OPENAI_API_KEY=your_openai_api_key_here

Replace your_openai_api_key_here with your actual OpenAI API key.

4. Make sure you have Node.js and npm installed on your machine.

Usage

1. Run the application by executing node your_script_name.js in your terminal.
2. Press Enter when prompted to start speaking.
3. Speak clearly into your microphone to interact with the Voice Assistant.
4. Press Enter again to stop recording and initiate the conversation.
5. Follow the on-screen instructions to continue the conversation or exit the application.

Dependencies

- node-microphone
- fs
- fluent-ffmpeg
- ffmpeg-static
- readline
- axios
- form-data
- speaker
- OpenAI
- dotenv
