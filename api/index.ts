
const PREDICTION_PROMPT = (youtubeVideo:string) => `
YouTube channel performance analysis:
The YouTube channel's content primarily focuses on innovation, technology, life lessons, media, and career topics presented in a knowledgeable, interesting, fascinating, skilled, informative, successful, and exploratory manner. This content is most likely to result in a good performance, with emotions such as hope and gratitude being particularly impactful. Additionally, incorporating actionable, numeric, versatile, entrepreneurial, and prosperous elements into the content could further boost its performance.

Conversely, content related to art, war, and religion may contribute to a poorer performance due to their association with surprise, awe, sadness emotions, perplexing, intense, unpredictable adjectives.

The median number of views for this channel is 324000, with the top quartile reaching 516000 views and the bottom quartile at 156000 views. This suggests that while the channel consistently generates a substantial audience, there is significant room for growth in viewership, particularly within the upper echelons of performance. To achieve this growth, the channel may want to focus on refining its content to better align with the emotions and topics associated with strong performance, while also finding ways to present its existing content in a more actionable, numeric, versatile, entrepreneurial, and prosperous manner.

Instructions:
Your task is to make a prediction on the number of views for a given YouTube video.
The prediction will be based on a YouTube channels analysis provided earlier.  
Do not provide additional explanations, only the expected number of views. The prediction needs to be numeric. 
Do not provide an introduction to your prediction either. Only provide the expected number of views.
Do not provide a range for your prediction, either.  

YouTube video title:
${youtubeVideo}

Prediction:
`


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

