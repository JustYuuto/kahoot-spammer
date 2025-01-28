const code = '220742';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0';

function decodeChallenge(challenge: string) {
  const decode = challenge.match(/decode\.call\(this, '([a-zA-Z0-9]+)'\)/)?.[1] as string;
  const offsetCalc = challenge.match(/var offset = ([\()+*\s\t0-9]+);/)?.[1] as string;
  const offset = new Function(`return ${offsetCalc}`)();

  return decode.replace(/./g, (char, position) => {
    return String.fromCharCode((((char.charCodeAt(0) * position) + offset) % 77) + 48);
  });
}

function concatTokens(token: string, challenge: string) {
  let result = '';
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    const mod = challenge.charCodeAt(i % challenge.length);
    const decodedChar = char ^ mod;
    result += String.fromCharCode(decodedChar);
  }

  return result;
}

fetch(`https://kahoot.it/reserve/session/${code}/`, {
  headers: {
    'User-Agent': userAgent,
  }
})
  .then(async (res) => {
    if (!res.ok) {
      console.error('Unknown game');
      return;
    }
    return {
      data: await res.json(),
      token: Buffer.from(res.headers.get('x-kahoot-session-token') as string, 'base64').toString('utf8'),
    };
  })
  .then((d) => {
    if (!d) return;
    const { data, token } = d;
    const challenge = decodeChallenge(data.challenge);
    const tokenChallenge = concatTokens(token, challenge);

    const ws = new WebSocket(`wss://kahoot.it/cometd/${code}/${tokenChallenge}`);
    let id = 0;
    let clientId = '';
    let ack = 0;

    function send(data: any) {
      data.id = String(id++);
      console.log('Sending', data);
      ws.send(JSON.stringify([data]));
    }

    ws.onopen = () => {
      console.log('Connection opened');
      send({
        version: '1.0',
        minimumVersion: '1.0',
        channel: '/meta/handshake',
        supportedConnectionTypes: ['websocket','long-polling','callback-polling'],
        advice: {
          timeout: 60000,
          interval: 0
        },
        ext: {
          ack: true,
          timesync: {
            tc: Date.now(),
            l: 0,
            o: 0
          }
        }
      });

      setTimeout(() => {
        send({
          channel: '/service/controller',
          data: {
            type: 'login',
            gameid: String(code),
            host: 'kahoot.it',
            name: `Bot${Math.floor(Math.random() * 1000)}`,
            content: JSON.stringify({
              device: {
                userAgent,
                screen: {
                  width: 1920,
                  height: 1080
                },
              },
            }),
          },
          clientId,
          ext: {},
        });
      }, 5000);
    }

    ws.onmessage = (event) => {
      const [data] = JSON.parse(event.data);
      console.log(data);

      if (data.error) {
        console.error(data.error);
        process.exit(1);
      }

      if (data.channel === '/meta/handshake') {
        clientId = data.clientId;

        send({
          channel: '/meta/connect',
          connectionType: 'websocket',
          advice: {
            timeout: 0
          },
          clientId,
          ext: {
            ack: ack++,
            timesync: {
              tc: Date.now(),
              l: 262,
              o: -14
            }
          }
        });
      } else if (data.channel === '/meta/connect') {
        send({
          channel: '/meta/connect',
          connectionType: 'websocket',
          clientId,
          ext: {
            ack: ack++,
            timesync: {
              tc: Date.now(),
              l: 262,
              o: -14
            }
          }
        });
      } else if (data.channel === '/service/controller') {
        if (data.data && data.data.type === 'loginResponse') {
          send({
            channel: '/service/controller',
            data: {
              gameid: String(code),
              type: 'message',
              host: 'kahoot.it',
              id: id + 1,
              content: JSON.stringify({
                usingNamerator: false,
              }),
              clientId,
              ext: {},
            },
          });
        }
      }
    };

    ws.onclose = () => {
      console.log('Connection closed');
    }
  });