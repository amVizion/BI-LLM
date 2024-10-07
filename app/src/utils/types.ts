
export type tScore = { label:string, score:number }

export type tClusterAttrStats = {
    label: string

    mean: number
    attrMean: number
    deltaMean: number

    rho: number
    attrRho: number
    deltaRho: number

    sd: number
    attrSd: number
    deltaSd: number

    prominence: number // attrMean * attrRho
    clusterProminence: number // mean * rho
    causality: number // deltaMean * attrRho
}

export interface iCorrelation { label:string, rho:number, mean:number, sd:number }


export interface iClusterReport { 
    index: number
    name: string
    title: string 
    summary: string
    description: string 
    analysis: string
}

export interface iReportAnalysis { 
    labels: string
    clusters: string
    verticals?: string
}

export interface iReport { 
    title: string
    intro: string
    clusters: iClusterReport[]
    analysis: iReportAnalysis
    conclusion:string 
}

export interface iCluster { 
    index:number

    name?:string
    summary?: string
    description?: string

    size:number
    rank:number
    color:string
    center:number[] 
    centroid:number[]
    avgOutput:number
    attributes: tClusterAttrStats[]

    subClusters?: iCluster[]
    verticalAttributes?: {[vertical:string]:tClusterAttrStats[]}
}

export interface iItem { 
    text:string
    output:number 
    embeddings:number[]
    labels:tScore[]
    prediction:number
    cluster:number
    center:number[]
    category?:string
}

export interface iScatterData {
    title: string
    x: number 
    y: number             
    z: number
    fit: number
    output: number
    fill:string
}


// Prominence is the mean times the correlation. How relevant is the attribute to the performance.
export interface iFullCorrelation extends iCorrelation { prominence:number } 
export type tVerticalCorrelations = {[vertical:string]:iFullCorrelation[]}

export interface iVerticals {
    verticals: string[]
    correlations: {[vertical:string]:number | null}
    labelCorrelations: {[vertical:string]:iCorrelation[]}
    verticalCorrelations?: tVerticalCorrelations
}
