// TODO: Add markdown syntax. Bold, and lists.
import { iResearch } from "../utils/types"


export const Report = ({ intro, body, conclusion }:iResearch) => <div 
    className="container content"
    style={{marginTop:'1.5rem'}}
>
    { intro.split(`\n`).map((p, i) => i === 0
        ?   <h1 className="title"> { p } </h1>
        :   <p> {p} </p> 
    )} 
    { body.map((b, i) => <div key = {i}>
        <h2 style={{marginTop:'1rem'}}> Cluster {i} </h2>
        { b.split(`\n`).map((p, i) => <p key={i}> {p} </p>) }
    </div>) }

    <h2 style={{marginTop:'1rem'}}> Conclusion </h2>
    <p> { conclusion } </p> 
</div>
