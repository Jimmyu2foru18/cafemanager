<?php
/**
 * WebSocket Server for CaféManager
 *
 * This script sets up a WebSocket server that facilitates real-time communication
 * between clients and the CaféManager application. It utilizes the Ratchet library
 * to handle WebSocket connections and manage client subscriptions.
 *
 * Key Features:
 * - **Real-Time Communication**: Allows for instant updates and notifications to
 *   connected clients, enhancing user experience.
 * - **Client Management**: Manages connected clients using a storage object, enabling
 *   efficient tracking and communication.
 * - **Subscription Management**: Supports client subscriptions to specific events,
 *   allowing for targeted message delivery.
 * - **Authentication**: Integrates authentication functionality to ensure secure
 *   access to the WebSocket server.
 *
 * Usage:
 * To run the WebSocket server, execute this script in a command line environment.
 * Ensure that the necessary dependencies are installed and configured before starting
 * the server.
 *
 * Example:
 * ```bash
 * php server.php
 * ```
 *
 * Note: This server is designed to work in conjunction with the CaféManager application,
 * and it requires a properly configured environment to function correctly.
 */
require_once '../vendor/autoload.php';
require_once '../config.php';
require_once '../auth.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WebSocketServer implements MessageComponentInterface {
    protected $clients;
    protected $subscriptions;
    protected $auth;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->subscriptions = [];
        $this->auth = new Auth();
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        $this->subscriptions[$conn->resourceId] = [];
        echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!isset($data['type'])) {
            return;
        }

        switch ($data['type']) {
            case 'auth':
                $this->handleAuth($from, $data);
                break;
            
            case 'subscribe':
                $this->handleSubscribe($from, $data);
                break;
            
            case 'unsubscribe':
                $this->handleUnsubscribe($from, $data);
                break;
            
            case 'message':
                $this->handleMessage($from, $data);
                break;
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        unset($this->subscriptions[$conn->resourceId]);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function handleAuth($client, $data) {
        if (!isset($data['token'])) {
            $this->sendError($client, 'No token provided');
            return;
        }

        $payload = $this->auth->validateToken($data['token']);
        if (!$payload) {
            $this->sendError($client, 'Invalid token');
            return;
        }

        // Store user info with connection
        $client->user = [
            'id' => $payload['sub'],
            'role' => $payload['role']
        ];

        $this->send($client, [
            'type' => 'auth',
            'status' => 'success'
        ]);
    }

    protected function handleSubscribe($client, $data) {
        if (!isset($client->user)) {
            $this->sendError($client, 'Authentication required');
            return;
        }

        if (!isset($data['channel'])) {
            $this->sendError($client, 'Channel not specified');
            return;
        }

        // Check if user has access to channel
        if (!$this->canAccessChannel($client->user, $data['channel'])) {
            $this->sendError($client, 'Access denied to channel');
            return;
        }

        $this->subscriptions[$client->resourceId][] = $data['channel'];
        
        $this->send($client, [
            'type' => 'subscribe',
            'status' => 'success',
            'channel' => $data['channel']
        ]);
    }

    protected function handleUnsubscribe($client, $data) {
        if (!isset($data['channel'])) {
            return;
        }

        $key = array_search(
            $data['channel'],
            $this->subscriptions[$client->resourceId]
        );
        
        if ($key !== false) {
            unset($this->subscriptions[$client->resourceId][$key]);
        }
    }

    protected function handleMessage($from, $data) {
        if (!isset($from->user)) {
            $this->sendError($from, 'Authentication required');
            return;
        }

        if (!isset($data['channel']) || !isset($data['message'])) {
            return;
        }

        // Broadcast message to all subscribers of the channel
        foreach ($this->clients as $client) {
            if ($from !== $client && 
                isset($this->subscriptions[$client->resourceId]) &&
                in_array($data['channel'], $this->subscriptions[$client->resourceId])
            ) {
                $this->send($client, [
                    'type' => 'message',
                    'channel' => $data['channel'],
                    'message' => $data['message'],
                    'from' => $from->user['id']
                ]);
            }
        }
    }

    protected function canAccessChannel($user, $channel) {
        // Define channel access rules
        $channelRules = [
            'orders' => ['staff', 'manager', 'admin'],
            'inventory' => ['manager', 'admin'],
            'reports' => ['manager', 'admin'],
            'system' => ['admin']
        ];

        $channelType = explode(':', $channel)[0];
        
        if (!isset($channelRules[$channelType])) {
            return false;
        }

        return in_array($user['role'], $channelRules[$channelType]);
    }

    protected function send($client, $data) {
        $client->send(json_encode($data));
    }

    protected function sendError($client, $message) {
        $this->send($client, [
            'type' => 'error',
            'message' => $message
        ]);
    }

    public function broadcast($channel, $message) {
        foreach ($this->clients as $client) {
            if (isset($this->subscriptions[$client->resourceId]) &&
                in_array($channel, $this->subscriptions[$client->resourceId])
            ) {
                $this->send($client, [
                    'type' => 'broadcast',
                    'channel' => $channel,
                    'message' => $message
                ]);
            }
        }
    }
}

// Create WebSocket server
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WebSocketServer()
        )
    ),
    Config::get('websocket_port')
);

echo "WebSocket server started on port " . Config::get('websocket_port') . "\n";
$server->run();
