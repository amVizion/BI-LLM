import { getAllVideos } from '../solutions/youtube/utils'
import { callOllama } from '../lib/utils/ollama'
import { iItem } from '../app/src/utils/types'
import { writeFileSync } from 'fs'
import express from 'express'
import cors from 'cors'


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

app.post('/write/predictions', async({ body }, res) => {
    // Get text from body:
    const { predictions } = body

    // Write to file:
    const jsonPredictions = JSON.stringify(predictions, null, 2)
    writeFileSync('ignore/predictions.json', jsonPredictions)

    res.send(200)
})

app.post('/write/clusters', async({ body }, res) => {
    // Get text from body:
    const { clusters } = body

    // Write to file:
    const jsonClusters = JSON.stringify(clusters, null, 2)
    writeFileSync('ignore/clusters.json', jsonClusters)

    res.send(200)
})

app.get('/videos/channel/:channel', async(req, res) => {
    const { channel } = req.params

    // Get all videos:
    const videos = await getAllVideos()
    const channelVideos = videos.filter(v => v.category === channel)
    res.send(channelVideos)
})

app.post('/videos/channels', async(req, res) => {
    const { channels }:{ channels:string[] } = req.body

    // Get all videos:
    const allVideos = await getAllVideos()
    const channelVideos:iItem[][] = channels.map(channel => {
        const videos = allVideos.filter(v => v.category === channel)
        const sortedVideos = videos.sort((a, b) => b.output - a.output)
        const topVideos = sortedVideos.slice(0, 10)
        return topVideos
    })
    
    res.send(channelVideos)
})


app.get('/videos/attributes/:attribute/description', async(req, res) => {
    const { attribute } = req.params

    // Get all videos:
    const videos = await getAllVideos()
    const sortedVideos = videos.sort((a, b) => 
        b.labels.find(l => l.label === attribute)!.score 
        - a.labels.find(l => l.label === attribute)!.score
    )

    const topVideos = sortedVideos.slice(0, 50)

    res.send({ videos:topVideos })
})

const getAttributeMedian = (videos:iItem[], attribute:string) => {
    const sortedVideos = videos.sort((a, b) => 
        b.labels.find(l => l.label === attribute)!.score 
        - a.labels.find(l => l.label === attribute)!.score
    )

    const topVideos = sortedVideos.slice(0, 50)
    const attrMedian = topVideos.sort((a, b) => a.output - b.output)[Math.floor(topVideos.length / 2)].output

    return attrMedian
}

app.get('/videos/attributes/:attribute/performance', async(req, res) => {
    const { attribute } = req.params

    // Get all videos:
    const videos = await getAllVideos()
    const sortedVideos = videos.sort((a, b) => b.output - a.output)
    const median = sortedVideos.sort((a, b) => a.output - b.output)[Math.floor(videos.length / 2)].output
    const attrMedian = getAttributeMedian(videos, attribute)

    const topQuartile = sortedVideos.slice(0, Math.floor(sortedVideos.length / 4))
    const bottomQuartile = sortedVideos.slice(Math.floor(sortedVideos.length * 3 / 4))

    const sortedTopQuartile = topQuartile.sort((a, b) => 
        b.labels.find(l => l.label === attribute)!.score
        - a.labels.find(l => l.label === attribute)!.score
    )

    const sortedBottomQuartile = bottomQuartile.sort((a, b) => 
        b.labels.find(l => l.label === attribute)!.score
        - a.labels.find(l => l.label === attribute)!.score
    ) // TODO: Create helper function to sort by attribute.

    const topVideos = sortedTopQuartile.slice(0, 20)
    const bottomVideos = sortedBottomQuartile.slice(sortedBottomQuartile.length - 20)

    res.send({ topVideos, bottomVideos, median, attrMedian })
})


app.listen(port, () => console.log(`amVizion API running on port ${port}`))
