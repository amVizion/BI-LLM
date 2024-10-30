import { youtube_v3 } from '@googleapis/youtube'

export interface iVideoDB {
    id:string
    title: string
    channelId: string
    channelName: string
    stats: {
        views?: number
        likes?: number
        comments?: number
    }
    publishedAt: Date
    createdAt: Date
    updatedAt: Date

    embeddings: number[]
    thumbnails?: youtube_v3.Schema$ThumbnailDetails
}

export interface iCommentDB {
    text: string
    videoId: string
    channelId: string
    authorId: string
    likeCount?: number
    totalLikes?: number
    replyCount?: number
    publishedAt?: Date
    isOwner: boolean
    replies: string[]
    embeddings: number[]
}

export interface iChannelDB {
    name: string
    id: string

    stats: {
        subscribers?: number
        videos?: number
        views?: number
    }
    createdAt: Date
    updatedAt: Date
    publishedAt?: Date
    thumbnails?: youtube_v3.Schema$ThumbnailDetails

    embeddings: number[]
}

export interface iSubscriptionDB {
    channelId: string
    subscribedFrom: string
    subscriptions: string[]
    createdAt: Date
    updatedAt: Date
}
