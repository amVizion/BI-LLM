/*

1. Generate report for vertical.
2. Generate sample prediction.
3. Generate summary.

*/


import { useState } from "react"
const OLLAMA_URL = 'http://localhost:11434/api/generate'


export const PromptBox = () => {
	const [prompt, setPrompt] = useState<string>('')
	const [loading, setLoading] = useState<boolean>(false)
	const [response, setResponse] = useState<string>('')

	const ollamaStream = async() => { 
    try{
        setLoading(true)
        setResponse('')

        const body = JSON.stringify({ prompt, model:'mistral' })
        const response:Response = await fetch(OLLAMA_URL, { method: 'POST', body })
        const reader = response?.body?.getReader()
        
        while (true) {
            const { done, value } = await reader!.read()

            if (done) break
            const { response } = JSON.parse(new TextDecoder().decode(value))
            setResponse((r) => `${r}${response}`)
        }
    } catch(e) { console.log(e) } 
    finally { setLoading(false) }
	} // TODO: Add try/catch with axios.

	return <div style={{maxWidth:1200, margin:'auto', marginBottom:32}}>
		<div className="field">
			<div className={`control ${loading && 'is-loading'}`}>
				<textarea 
					rows={12}
					value={response || prompt}
					className="textarea" 
					style={{color:'white'}}
					onChange={({ target }) => setPrompt(target.value)}
				/>
			</div>
		</div>

		<div className="field is-grouped is-justify-content-right	">
			<div className="control">
				<button 
					className="button is-light" 
					style={{marginRight:12}}
					onClick={() => setResponse('')}
				> Clear </button>

				<button 
					className={`button is-link ${loading && 'is-loading'}`} 
					onClick={ollamaStream}
				>Predict</button>
			</div>
		</div>
	</div>
}
