import { Server } from 'hinos'

export default function env(Server: Server) {
  console.log('Production mode', Server.toString())
}
