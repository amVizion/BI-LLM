// TODO: Add markdown syntax. Bold, and lists.
import { iReport } from "../utils/types"


export const Report = ({ title, intro, clusters, analysis, conclusion }:iReport) => <div 
    className="container content"
    style={{marginTop:'1.5rem'}}
>
    <h1 className="title"> { title.split('\n')[0] } </h1>

    { intro.split(`\n`).map((p, i) => <p key={i}> {p} </p> )} 

    <h2 style={{marginTop:'1rem'}}> Cluster's Description </h2>

    { 
        clusters.map(({ title, description }) => <>
            { description.split(`\n`).map((p, i) => 
                i === 0 
                ? <p> <b> {title}: </b> { p } </p>
                : <p key={i}> {p} </p>
            )}
        </>) 
    }

    <h2 style={{marginTop:'1rem'}}> Analysis </h2>

    { analysis.labels.split('\n').map((p, i) => <p key={i}> { p } </p> ) }
    { analysis.clusters.split('\n\n').map((p, i) => <p key={i}> { p } </p> ) }
    { 
        analysis.verticals && 
        analysis.verticals.split('\n').map((p, i) => <p key={i}> { p } </p> ) 
    }

    <h2 style={{marginTop:'1rem'}}> Conclusion </h2>
    <p> { conclusion } </p> 
</div>
