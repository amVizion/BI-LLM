import { iVideoDB, iCommentDB, iChannelDB, iSubscriptionDB } from './models'
import { youtube_v3 } from '@googleapis/youtube'

export const mapVideo = (video: youtube_v3.Schema$Video): iVideoDB => {
    if(!video.id) throw new Error('Invalid video object')
    if(!video.snippet) throw new Error('Invalid video object')

        const { title, channelId, channelTitle:channelName } = video.snippet
    if(!title || !channelId || !channelName) throw new Error('Invalid video object')

    // Convert statistics to number. Else undefined
    const views = video.statistics?.viewCount ? parseInt(video.statistics.viewCount) : undefined
    const likes = video.statistics?.likeCount ? parseInt(video.statistics.likeCount) : undefined
    const comments = video.statistics?.commentCount ? parseInt(video.statistics.commentCount) : undefined

    // Published at or undefined
    const publishedAt = video.snippet.publishedAt ? new Date(video.snippet.publishedAt) : undefined
    if(!publishedAt) throw new Error('Invalid video object')

    return {
        id: video.id,
        title,
        channelId,
        channelName,
        stats: {
            views: views || undefined,
            likes: likes || undefined,
            comments: comments || undefined
        },
        publishedAt: publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        embeddings: [],
        thumbnails: video.snippet.thumbnails
    }
}

export const mapComment = (comment: youtube_v3.Schema$CommentThread): iCommentDB => {
    const { snippet } = comment
    console.log('snippet', snippet)
    console.log(snippet?.topLevelComment)
    if(!snippet || !snippet.topLevelComment) throw new Error('Invalid comment object')

    const { topLevelComment } = snippet
    if(!topLevelComment.snippet) throw new Error('Invalid comment object')
    const text = topLevelComment.snippet.textDisplay
    const videoId = snippet.videoId
    const channelId = snippet.channelId
    const authorId = topLevelComment.snippet.authorChannelId?.value
    
    if(!text || !videoId || !channelId ! || !authorId) throw new Error('Invalid comment object')

    const publishedAt = topLevelComment.snippet.publishedAt ? new Date(topLevelComment.snippet.publishedAt) : undefined
    const isOwner = authorId === channelId
    const replyTexts = comment.replies?.comments?.map(c => c.snippet?.textDisplay || '') || []
    const totalLikes = comment.replies?.comments?.reduce((acc, reply) => acc + (reply.snippet?.likeCount || 0), 0) || 0
    
    return {
        text,
        videoId,
        channelId,
        authorId,
        likeCount: topLevelComment.snippet.likeCount || undefined,
        totalLikes: totalLikes,
        replyCount: snippet.totalReplyCount || undefined,
        publishedAt,
        isOwner: isOwner,
        embeddings: [],
        replies: replyTexts,
    }
}

export const mapChannel = (channel: youtube_v3.Schema$Channel): iChannelDB => {
    if(!channel.id) throw new Error('Invalid channel object')
    if(!channel.snippet) throw new Error('Invalid channel object')

    const { title:name } = channel.snippet
    if(!name) throw new Error('Invalid channel object')

    const stats = channel.statistics || {}
    const subscribers = stats.subscriberCount ? parseInt(stats.subscriberCount) : undefined
    const videos = stats.videoCount ? parseInt(stats.videoCount) : undefined
    const views = stats.viewCount ? parseInt(stats.viewCount) : undefined

    const publishedAt = channel.snippet.publishedAt ? new Date(channel.snippet.publishedAt) : undefined

    return {
        name,
        id: channel.id,
        stats: {
            subscribers: subscribers || undefined,
            videos: videos || undefined,
            views: views || undefined
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt,
        embeddings: [],
        thumbnails: channel.snippet.thumbnails
    }
}

interface iMapSubscriptionInput { channel:string, subscribedFrom:string, subs:youtube_v3.Schema$Subscription[] }
export const mapSubscription = (input:iMapSubscriptionInput): iSubscriptionDB => {
    const { channel, subscribedFrom, subs } = input
    const subscriptions = subs.map(sub => sub.snippet?.resourceId?.channelId).filter(id => id) as string[]
    const createdAt = new Date()
    const updatedAt = new Date()
    return { channelId: channel, subscribedFrom, subscriptions, createdAt, updatedAt }
}
