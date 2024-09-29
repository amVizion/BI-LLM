
const PREDICTION_PROMPT = (youtubeVideo:string) => `
YouTube channel performance analysis:
The YouTube channel in question performs well when the content focuses on topics related to career, success, lifestyle, investing, and emotes feelings of hope, mystery, and aspiration. The content should be practical, versatile, persuasive, complex, and motivational to maximize performance.

Conversely, the channel's performance deteriorates when the content is about war, culture, writing, art, or other similar topics that evoke surprise, awe, intrigue, perplexity, intensity, unusualness, rawness, and psychological complexity.

The median number of views for this channel is 324000, with the top quartile reaching 516000 views and the bottom quartile at 156000 views. 

Instructions:
Your task is to make a prediction on the number of views for a given YouTube video.
The prediction will be based on a YouTube channels analysis provided earlier.  
Do not provide additional explanations, only the expected number of views. The prediction needs to be numeric. 
Do not provide an introduction to your prediction either. Only provide the expected number of views.
Do not provide a range for your prediction, either.  

YouTube video title:
${youtubeVideo}

Prediction:`


import { callOllama } from '../lib/utils/ollama'
import { writeFileSync } from 'fs'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(express.json())
app.use(cors())

const port = 3000

app.post('/prediction', async({ body }, res) => {
    // Get text from body:
    const { text } = body

    // Prepater prompt:
    const prompt = PREDICTION_PROMPT(text)

    // Call Ollama:
    const response = await callOllama(prompt)

    return res.send(response)
})

app.post('/writeFile', async({ body }, res) => {
    // Get text from body:
    const { predictions } = body

    // Write to file:
    const jsonPredictions = JSON.stringify(predictions, null, 2)
    writeFileSync('predictions.json', jsonPredictions)
})


app.listen(port, () => console.log(`amVizion API running on port ${port}`))

