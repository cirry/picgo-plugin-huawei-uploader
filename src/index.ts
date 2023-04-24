import picgo from 'picgo'
import { IPluginConfig } from 'picgo/dist/utils/interfaces'
import crypto from 'crypto'
const mime_types = require("mime")
import { getDatePath } from "./helper";
const generateSignature = (options: any, fileName: string): string => {
  const date = new Date().toUTCString()
  const mimeType = mime_types.getType(fileName)
  if (!mimeType) {
    throw Error(`No mime type found for file ${fileName}`)
  }
  const path = options.path
  const strToSign = `PUT\n\n${mimeType}\n${date}\n/${options.bucketName}${path ? '/' + encodeURI(options.path) : ''}${getDatePath(options.isAutoArchive)}/${encodeURI(fileName)}`
  const signature = crypto.createHmac('sha1', options.accessKeySecret).update(strToSign).digest('base64')
  return `OBS ${options.accessKeyId}:${signature}`
}

const postOptions = (options: any, fileName: string, signature: string, image: Buffer): any => {
  const path = options.path
  const mimeType = mime_types.getType(fileName)
  return {
    method: 'PUT',
    url: `https://${options.bucketName}.${options.endpoint}${path ? '/' + encodeURI(options.path) : ''}${getDatePath(options.isAutoArchive)}/${encodeURI(fileName)}`,
    headers: {
      Authorization: signature,
      Date: new Date().toUTCString(),
      'content-type': mimeType
    },
    body: image,
    resolveWithFullResponse: true
  }
}

const handle = async (ctx) => {
  const obsOptions = ctx.getConfig('picBed.huawei-obs-upload')
  if (!obsOptions) {
    throw new Error('找不到华为OBS图床配置文件')
  }
  try {
    const images = ctx.output
    for (const img of images) {
      if (img.fileName && img.buffer) {
        const signature = generateSignature(obsOptions, img.fileName)
        let image = img.buffer
        if (!image && img.base64Image) {
          image = Buffer.from(img.base64Image, 'base64')
        }
        const options = postOptions(obsOptions, img.fileName, signature, image)
        const response = await ctx.request(options)
        if (response.statusCode === 200) {
          delete img.base64Image
          delete img.buffer
          const path = obsOptions.path
          const domain = obsOptions.customDomain ? obsOptions.customDomain : `https://${obsOptions.bucketName}.${obsOptions.endpoint}`
          img.url = img.imgUrl = `${domain}${path ? '/' + path : ''}${getDatePath(obsOptions.isAutoArchive)}/${img.fileName}`

          if (obsOptions.imageProcess) {
            img.imgUrl += obsOptions.imageProcess
          }
        }
      }
    }
    return ctx
  } catch (err) {
    let message = err.message
    ctx.emit('notification', {
      title: '上传失败！',
      body: message
    })
  }
}

const config = (ctx): IPluginConfig[] => {
  const userConfig = ctx.getConfig('picBed.huawei-obs-upload') ||
  {
    accessKeyId: '',
    accessKeySecret: '',
    bucketName: '',
    endpoint: '',
    path: '',
    imageProcess: '',
    customDomain: '',
    isAutoArchive: '',
  }
  return [
    {
      name: 'accessKeyId',
      type: 'input',
      alias: 'AccessKeyId',
      default: userConfig.accessKeyId || '',
      message: '例如XLHAFIDTRNX8SD6GYF1K',
      required: true
    },
    {
      name: 'accessKeySecret',
      type: 'password',
      alias: 'AccessKeySecret',
      default: userConfig.accessKeySecret || '',
      message: '例如JuVs00Hua1YEDtJpEGaoOetYun3CFengXvjVbts4',
      required: true
    },
    {
      name: 'bucketName',
      type: 'input',
      alias: '桶名称',
      default: userConfig.bucketName || '',
      message: '例如bucket01',
      required: true
    },
    {
      name: 'endpoint',
      type: 'input',
      alias: 'EndPoint',
      default: userConfig.endpoint || '',
      message: '例如obs.cn-south-1.myhuaweicloud.com',
      required: true
    },
    {
      name: 'path',
      type: 'input',
      alias: '存储路径',
      message: '在桶中存储的路径，例如img或img/github',
      default: userConfig.path || '',
      required: false
    },
    {
      name: 'imageProcess',
      type: 'input',
      alias: '网址后缀',
      message: '例如?x-image-process=image/resize,p_100',
      default: userConfig.imageProcess || '',
      required: false
    },
    {
      name: 'customDomain',
      type: 'input',
      alias: '自定义域名',
      message: '例如https://mydomain.com',
      default: userConfig.customDomain || '',
      required: false
    },
    {
      name: 'isAutoArchive',
      type: 'confirm',
      default: userConfig.isAutoArchive || false,
      required: false,
      message: '将上传文件存放到当天日期的目录下',
      alias: '自动归档'
    }
  ]
}

export = (ctx) => {
  const register = () => {
    ctx.helper.uploader.register('huawei-obs-upload', {
      handle,
      name: '华为云OBS',
      config: config
    })
  }
  return {
    uploader: 'huawei-obs-upload',
    register
  }
}
