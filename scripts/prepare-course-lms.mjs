import {writeFile} from 'node:fs/promises'
import {seed,publicCourse} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'

const html=renderCourse(publicCourse(seed),[])
await writeFile(new URL('../public/guides/become-the-thousand-servers/index.html',import.meta.url),html)
