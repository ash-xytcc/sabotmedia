import {writeFile} from 'node:fs/promises'
import {seed,publicCourse,contributorNames,id} from '../public/guides/become-the-thousand-servers/lms/model.js'
import {renderCourse} from '../public/guides/become-the-thousand-servers/lms/render.js'
await writeFile(new URL('../public/guides/become-the-thousand-servers/index.html',import.meta.url),renderCourse(publicCourse(seed),contributorNames.map(name=>({id:id(name),name}))))
