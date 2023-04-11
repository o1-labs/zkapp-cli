// To enable SnarkyJS for the web, we must set the COOP and COEP headers.
// See here for more information: https://docs.minaprotocol.com/zkapps/how-to-write-a-zkapp-ui#enabling-coop-and-coep-headers
export default defineEventHandler(({ node: { req, res } }) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
});
