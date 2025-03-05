
// export const config: Record<string, string | number> = {
//   token: 'OTU0NTEzOTg2NjI2Mzg3OTY5.G8Jg0d.IXIaAYKiYHNWXazkicS4d6XdpHpjj9zRJaom5E',
//   color: 0x0099FF,
//   thumbnail: 'https://i.imgur.com/AfFp7pu.png'
// }

export const config: Record<string, string | number> = {
  token: process.env.TOKEN as string,
  color: 0x0099FF,
  thumbnail: process.env.THUMBNAIL as string,
}

console.log({ config });
