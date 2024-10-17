import { writeFileSync } from 'fs'
import axios from 'axios'

/*

TODO: 
- Parametrize to allow other providers.
- Parametrize to allow other models.
- Make writing logs optional.
- Add streaming.

- Move util to API wrapper for web app.

*/

const LOGS_DIR = '../../data/logs' // TODO: Use cwd.
const OLLAMA_URL = 'http://localhost:11434/api/generate'

export const callOllama = async(prompt:string, log=true, store=false):Promise<string> => {
    if(log) console.log('prompt', prompt)

    const request = { prompt, model:'mistral', stream:false, verbose:true }
    const { data } = await axios.post(OLLAMA_URL, request)
    const dateToString = new Date().toISOString().replace(/:/g, '-')

    if(log) console.log('response', data.response)
    
    const fileName = `${LOGS_DIR}/${dateToString}.txt`
    if(store) writeFileSync(fileName, `${prompt}:\n\n${data.response}`)

    console.log('duration', data.total_duration/(10**9))
    return data.response

}
