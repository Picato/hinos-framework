import { helmet } from 'hinos-helmet'

export default function env(Server) {
  console.log('Production mode')
  Server.use(helmet.default())
}
