
// export const config: Record<string, string | number> = {
//   token: 'OTU0NTEzOTg2NjI2Mzg3OTY5.G8Jg0d.IXIaAYKiYHNWXazkicS4d6XdpHpjj9zRJaom5E',
//   color: 0x0099FF,
//   thumbnail: 'https://i.imgur.com/AfFp7pu.png'
// }

export const config: Record<string, string | number> = {
  token: process.env.TOKEN as string,
  color: 0x0099FF,
  thumbnail: process.env.THUMBNAIL as string,
  region: process.env.REGION as string,
  endpoint: process.env.ENDPOINT as string,
  accessKeyId: process.env.ACCESS_KEY_ID as string,
  secretAccessKey: process.env.SECRET_ACCESS_KEY as string
}