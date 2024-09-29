// TODO: Add markdown syntax. Bold, and lists.
import REPORT from '../data/report.json'
import { ReactNode } from "react"

const P = ({ children }:{children:ReactNode}) => <p style={{color:'white'}}> { children } </p>

export const Report = () => <div 
    className="container content"
    style={{marginTop:'1.5rem'}}
>
    <h1 className="title"> { REPORT.title.split('\n')[0] } </h1>

    { REPORT.intro.split(`\n`).map((p, i) => <P key={i}> {p} </P> )} 

    <h2 style={{marginTop:'1rem', color:'white'}}> Cluster's Description </h2>

    { 
        REPORT.clusters.map(({ title, description }) => <>
            { description.split(`\n`).map((p, i) => 
                i === 0 
                ? <P> <b> {title}: </b> { p } </P>
                : <P key={i}> {p} </P>
            )}
        </>) 
    }

    <h2 style={{marginTop:'1rem'}}> Analysis </h2>

    { REPORT.analysis.labels.split('\n').map((p, i) => <P key={i}> { p } </P> ) }
    { REPORT.analysis.clusters.split('\n\n').map((p, i) => <P key={i}> { p } </P> ) }

    <h2 style={{marginTop:'1rem'}}> Conclusion </h2>
    <P> { REPORT.conclusion } </P> 
</div>
