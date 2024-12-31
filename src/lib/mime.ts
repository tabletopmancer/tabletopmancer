import { Mime } from 'mime/lite'
import standardTypes from 'mime/types/standard.js'

const mime = new Mime(standardTypes, {
  'application/vnd.universal.vtt': ['uvtt', 'dd2vtt'],
})

export default mime
