import { Server } from 'hinos'

export default function env(Server: Server) {
  console.log('Development mode', Server.toString())
}
