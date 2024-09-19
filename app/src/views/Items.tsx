/*

- Chart listing elements.
- Table listing top scores, and 

*/

import { verticals, labelCorrelations } from '../data/verticals.json'
import { VerticalCorrelations } from "../components/Correlations"
import { Predictions } from '../components/Predictions'
import { PromptBox } from '../components/PromptBox'
import { Chart } from "../components/Chart"
import DATA from '../data/data.json'


export const Items = () => <div className='container' style={{maxWidth:1600}}>
    <Chart data={DATA} outputKey='Views'/>
    <PromptBox />

    <VerticalCorrelations 
        verticals={verticals} 
        verticalCorrelations={labelCorrelations} 
    />

    <Predictions items={DATA.sort((a, b) => b.output - a.output)}/>
</div>
