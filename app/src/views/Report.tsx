// TODO: Add markdown syntax. Bold, and lists.
import { ReactNode } from "react"
import { iReport } from "../utils/types"

const P = ({ children }:{children:ReactNode}) => <p style={{color:'white'}}> { children } </p>

export const Report = ({ title, intro, clusters, analysis, conclusion }:iReport) => <div 
    className="container content"
    style={{marginTop:'1.5rem'}}
>
    <h1 className="title"> { title.split('\n')[0] } </h1>

    { intro.split(`\n`).map((p, i) => <P key={i}> {p} </P> )} 

    <h2 style={{marginTop:'1rem', color:'white'}}> Cluster's Description </h2>

    { 
        clusters.map(({ title, description }) => <>
            { description.split(`\n`).map((p, i) => 
                i === 0 
                ? <P> <b> {title}: </b> { p } </P>
                : <P key={i}> {p} </P>
            )}
        </>) 
    }

    <h2 style={{marginTop:'1rem'}}> Analysis </h2>

    { analysis.labels.split('\n').map((p, i) => <P key={i}> { p } </P> ) }
    { analysis.clusters.split('\n\n').map((p, i) => <P key={i}> { p } </P> ) }
    { 
        analysis.verticals && 
        analysis.verticals.split('\n').map((p, i) => <P key={i}> { p } </P> ) 
    }

    <h2 style={{marginTop:'1rem'}}> Conclusion </h2>
    <P> { conclusion } </P> 
</div>
