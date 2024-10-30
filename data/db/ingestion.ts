import { getChannelVideos, getComments, getSubscriptions, countSubscriptions } from '../../solutions/youtube'
import { mapChannel, mapSubscription, mapComment, mapVideo } from './mappers'
import { iSubscriptionDB, iCommentDB } from './models'
import { getMongoClient, DB_NAME } from './client'
import { embed, getEmbeddings } from '../../lib/pipelines/1.ERL'

interface iIngestionPipelineProps { channelName?:string, channelId?:string, insertComments?:boolean }
const ingestionPipeline = async(props:iIngestionPipelineProps) => {
    const { channelName, channelId, insertComments } = props

    // Retrieve most recent videos for the channel
    if(!channelName && !channelId) throw new Error('Invalid input. Missing channelName or channelId')
    const { videos, channel } = await getChannelVideos({ channelId: channelName || channelId!, forHandle: !!channelName })
    const dbVideos = videos.map(mapVideo)
    const dbChannel = mapChannel(channel)
    const client = await getMongoClient()
    const db = client.db(DB_NAME)

    const titles = dbVideos.map(v => v.title)
    const embeddings = await getEmbeddings(titles)
    const embeddedVideos = dbVideos.map((v, i) => ({...v, embeddings: embeddings[i].embeddings}))

    // NLP metrics by channel
    for (const video of embeddedVideos) {
        const videoQuery = { id: video.id };
        await db.collection('Videos').updateOne(
            videoQuery, 
            { $set: video }, 
            { upsert: true }
        )
    }


    const channelQuery = { id: dbChannel.id };
    await db.collection('Channels').updateOne(
        channelQuery, 
        { $set: dbChannel }, 
        { upsert: true }
    )

    if(!insertComments) return client.close()

    const allComments = []

    // Retrieve comments for the videos
    for (const video of dbVideos) {
        if(!video.id) continue

        // If video more than one year skip
        const diff = new Date().getTime() - video.publishedAt.getTime()
        if(diff > 365 * 24 * 60 * 60 * 1000) continue
        
        const comments = await getComments(video.id!)
        if(comments.length === 0) continue

        const filteredComments = comments.filter(c=> c.snippet?.topLevelComment)
        filteredComments.forEach(c => console.log(c.snippet?.topLevelComment?.kind))
        const dbComments = filteredComments.map(mapComment)        

        await db.collection('Comments').insertMany(dbComments)
        allComments.push(...comments)
    }

    console.log('Comments:', allComments.length)
    client.close()
}

const explorationPipeline = async(channelId:string) => {
    // Get top comments
    const client = await getMongoClient()
    const db = client.db(DB_NAME)

    // Select top comments
    const comments = await db.collection<iCommentDB>('Comments').find({channelId:'UCP0f9FXZ4g-MxAqSUreHpCw'})
    .sort({ likeCount: -1 }).limit(1000).toArray()

    console.log('Comments:', comments.length)
    const channel = comments[0].channelId
    const authors = comments.map(c => c.authorId)
    const uniqueAuthors = [...new Set(authors)]

    // Retrieve subscription list
    for (const author of uniqueAuthors) {
        try{
            console.log('author', author)
            const subs = await getSubscriptions(author)
            const subsDB = mapSubscription({ channel:author, subs, subscribedFrom:channel })
    
            const query = { channel: author };
            await db.collection('Subscriptions').updateOne(
                query, 
                { $set: subsDB }, 
                { upsert: true }
            )    
        } catch(e) { }
    }

    client.close()
}

export const retrieveSubscriptions = async(channelId:string, channelName:string) => {
    const client = await getMongoClient()
    const db = client.db(DB_NAME)

    // Aggregate subscriptions by channel
    const subscriptions = await db.collection<iSubscriptionDB>('Subscriptions').find().toArray()
    const subscriptionCounter = {
        channel: channelName,
        subscriptions: countSubscriptions(subscriptions)
    }

    // Retrieve videos from selected channels
    for (const sub of subscriptionCounter.subscriptions) {
        await ingestionPipeline({ channelId: sub.channelId, insertComments: true })
    }

    client.close()
}



// explorationPipeline('TaylorBell').catch()
retrieveSubscriptions('UCP0f9FXZ4g-MxAqSUreHpCw', 'TaylorBell').catch()


// TODO: Suggest next channel
