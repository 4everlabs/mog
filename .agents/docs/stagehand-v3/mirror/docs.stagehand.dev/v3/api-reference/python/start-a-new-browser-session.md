> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Start a new browser session

> Creates a new browser session with the specified configuration. Returns a session ID used for all subsequent operations.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/start
openapi: 3.1.0
info:
  title: Stagehand API
  version: 3.1.0
  description: >-
    Stagehand SDK for AI browser automation [ALPHA]. This API allows clients to

    execute browser automation tasks remotely on the Browserbase cloud.

    All endpoints except /sessions/start require an active session ID.

    Responses are streamed using Server-Sent Events (SSE) when the

    `x-stream-response: true` header is provided.


    This SDK is currently ALPHA software and is not production ready!

    Please try it and give us your feedback, stay tuned for upcoming release
    announcements!
  contact:
    name: Browserbase
    url: https://browserbase.com
servers:
  - url: https://api.stagehand.browserbase.com
security:
  - BrowserbaseApiKey: []
    BrowserbaseProjectId: []
    ModelApiKey: []
paths:
  /v1/sessions/start:
    post:
      summary: Start a new browser session
      description: >-
        Creates a new browser session with the specified configuration. Returns
        a session ID used for all subsequent operations.
      operationId: SessionStart
      parameters:
        - schema:
            description: Whether to stream the response via SSE
            example: 'true'
            type: string
            enum:
              - 'true'
              - 'false'
          in: header
          name: x-stream-response
          description: Whether to stream the response via SSE
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SessionStartRequest'
        required: true
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionStartResponse'
      x-codeSamples:
        - lang: JavaScript
          source: >-
            import Stagehand from 'stagehand-sdk';


            const client = new Stagehand({
              browserbaseAPIKey: process.env['BROWSERBASE_API_KEY'], // This is the default and can be omitted
              browserbaseProjectID: process.env['BROWSERBASE_PROJECT_ID'], // This is the default and can be omitted
              modelAPIKey: process.env['MODEL_API_KEY'], // This is the default and can be omitted
            });


            const response = await client.sessions.start({ modelName:
            'openai/gpt-4o' });


            console.log(response.data);
        - lang: Python
          source: |-
            import os
            from stagehand import Stagehand

            client = Stagehand(
                browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),  # This is the default and can be omitted
                browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),  # This is the default and can be omitted
                model_api_key=os.environ.get("MODEL_API_KEY"),  # This is the default and can be omitted
            )
            response = client.sessions.start(
                model_name="openai/gpt-4o",
            )
            print(response.data)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Start(context.TODO(), stagehand.SessionStartParams{\n\t\tModelName: \"openai/gpt-4o\",\n\t})\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionStartParams;
            import com.browserbase.api.models.sessions.SessionStartResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionStartParams params = SessionStartParams.builder()
                        .modelName("openai/gpt-4o")
                        .build();
                    SessionStartResponse response = client.sessions().start(params);
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionStartParams
            import com.browserbase.api.models.sessions.SessionStartResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val params: SessionStartParams = SessionStartParams.builder()
                    .modelName("openai/gpt-4o")
                    .build()
                val response: SessionStartResponse = client.sessions().start(params)
            }
        - lang: Ruby
          source: |-
            require "stagehand"

            stagehand = Stagehand::Client.new(
              browserbase_api_key: "My Browserbase API Key",
              browserbase_project_id: "My Browserbase Project ID",
              model_api_key: "My Model API Key"
            )

            response = stagehand.sessions.start(model_name: "openai/gpt-4o")

            puts(response)
components:
  schemas:
    SessionStartRequest:
      type: object
      properties:
        modelName:
          description: Model name to use for AI operations
          example: openai/gpt-4o
          type: string
        domSettleTimeoutMs:
          description: Timeout in ms to wait for DOM to settle
          example: 5000
          type: number
        verbose:
          description: Logging verbosity level (0=quiet, 1=normal, 2=debug)
          example: 1
          type: number
          enum:
            - 0
            - 1
            - 2
        systemPrompt:
          description: Custom system prompt for AI operations
          type: string
        browserbaseSessionCreateParams:
          $ref: '#/components/schemas/BrowserbaseSessionCreateParams'
        browser:
          $ref: '#/components/schemas/BrowserConfig'
        selfHeal:
          description: Enable self-healing for failed actions
          example: true
          type: boolean
        browserbaseSessionID:
          description: Existing Browserbase session ID to resume
          type: string
        experimental:
          type: boolean
        waitForCaptchaSolves:
          description: Wait for captcha solves (deprecated, v2 only)
          type: boolean
        actTimeoutMs:
          description: Timeout in ms for act operations (deprecated, v2 only)
          type: number
      required:
        - modelName
    SessionStartResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/SessionStartResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    BrowserbaseSessionCreateParams:
      type: object
      properties:
        projectId:
          type: string
        browserSettings:
          $ref: '#/components/schemas/BrowserbaseBrowserSettings'
        extensionId:
          type: string
        keepAlive:
          type: boolean
        proxies:
          anyOf:
            - type: boolean
            - type: array
              items:
                $ref: '#/components/schemas/ProxyConfig'
        region:
          $ref: '#/components/schemas/BrowserbaseRegion'
        timeout:
          type: number
        userMetadata:
          type: object
          propertyNames:
            type: string
          additionalProperties: {}
    BrowserConfig:
      type: object
      properties:
        type:
          description: Browser type to use
          example: local
          type: string
          enum:
            - local
            - browserbase
        cdpUrl:
          description: Chrome DevTools Protocol URL for connecting to existing browser
          example: ws://localhost:9222
          type: string
        launchOptions:
          $ref: '#/components/schemas/LocalBrowserLaunchOptions'
    SessionStartResultOutput:
      type: object
      properties:
        sessionId:
          description: Unique Browserbase session identifier
          example: c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123
          type: string
        cdpUrl:
          description: >-
            CDP WebSocket URL for connecting to the Browserbase cloud browser
            (present when available)
          example: wss://connect.browserbase.com/?signingKey=abc123
          anyOf:
            - type: string
            - type: 'null'
        available:
          type: boolean
      required:
        - sessionId
        - available
      additionalProperties: false
    BrowserbaseBrowserSettings:
      type: object
      properties:
        advancedStealth:
          type: boolean
        blockAds:
          type: boolean
        context:
          $ref: '#/components/schemas/BrowserbaseContext'
        extensionId:
          type: string
        fingerprint:
          $ref: '#/components/schemas/BrowserbaseFingerprint'
        logSession:
          type: boolean
        recordSession:
          type: boolean
        solveCaptchas:
          type: boolean
        viewport:
          $ref: '#/components/schemas/BrowserbaseViewport'
    ProxyConfig:
      oneOf:
        - $ref: '#/components/schemas/BrowserbaseProxyConfig'
        - $ref: '#/components/schemas/ExternalProxyConfig'
      type: object
      discriminator:
        propertyName: type
        mapping:
          browserbase:
            $ref: '#/components/schemas/BrowserbaseProxyConfig'
          external:
            $ref: '#/components/schemas/ExternalProxyConfig'
    BrowserbaseRegion:
      type: string
      enum:
        - us-west-2
        - us-east-1
        - eu-central-1
        - ap-southeast-1
    LocalBrowserLaunchOptions:
      type: object
      properties:
        args:
          type: array
          items:
            type: string
        executablePath:
          type: string
        port:
          type: number
        userDataDir:
          type: string
        preserveUserDataDir:
          type: boolean
        headless:
          type: boolean
        devtools:
          type: boolean
        chromiumSandbox:
          type: boolean
        ignoreDefaultArgs:
          anyOf:
            - type: boolean
            - type: array
              items:
                type: string
        proxy:
          type: object
          properties:
            server:
              type: string
            bypass:
              type: string
            username:
              type: string
            password:
              type: string
          required:
            - server
        locale:
          type: string
        viewport:
          type: object
          properties:
            width:
              type: number
            height:
              type: number
          required:
            - width
            - height
        deviceScaleFactor:
          type: number
        hasTouch:
          type: boolean
        ignoreHTTPSErrors:
          type: boolean
        cdpUrl:
          type: string
        cdpHeaders:
          type: object
          propertyNames:
            type: string
          additionalProperties:
            type: string
        connectTimeoutMs:
          type: number
        downloadsPath:
          type: string
        acceptDownloads:
          type: boolean
      additionalProperties: false
    BrowserbaseContext:
      type: object
      properties:
        id:
          type: string
        persist:
          type: boolean
      required:
        - id
    BrowserbaseFingerprint:
      type: object
      properties:
        browsers:
          type: array
          items:
            type: string
            enum:
              - chrome
              - edge
              - firefox
              - safari
        devices:
          type: array
          items:
            type: string
            enum:
              - desktop
              - mobile
        httpVersion:
          type: string
          enum:
            - '1'
            - '2'
        locales:
          type: array
          items:
            type: string
        operatingSystems:
          type: array
          items:
            type: string
            enum:
              - android
              - ios
              - linux
              - macos
              - windows
        screen:
          $ref: '#/components/schemas/BrowserbaseFingerprintScreen'
    BrowserbaseViewport:
      type: object
      properties:
        width:
          type: number
        height:
          type: number
    BrowserbaseProxyConfig:
      type: object
      properties:
        type:
          type: string
          const: browserbase
        domainPattern:
          type: string
        geolocation:
          $ref: '#/components/schemas/BrowserbaseProxyGeolocation'
      required:
        - type
    ExternalProxyConfig:
      type: object
      properties:
        type:
          type: string
          const: external
        server:
          type: string
        domainPattern:
          type: string
        username:
          type: string
        password:
          type: string
      required:
        - type
        - server
    BrowserbaseFingerprintScreen:
      type: object
      properties:
        maxHeight:
          type: number
        maxWidth:
          type: number
        minHeight:
          type: number
        minWidth:
          type: number
    BrowserbaseProxyGeolocation:
      type: object
      properties:
        country:
          type: string
        city:
          type: string
        state:
          type: string
      required:
        - country
  securitySchemes:
    BrowserbaseApiKey:
      type: apiKey
      in: header
      name: x-bb-api-key
      description: Browserbase API key for authentication
    BrowserbaseProjectId:
      type: apiKey
      in: header
      name: x-bb-project-id
      description: Browserbase project ID
    ModelApiKey:
      type: apiKey
      in: header
      name: x-model-api-key
      description: API key for the AI model provider (OpenAI, Anthropic, etc.)

````

Built with [Mintlify](https://mintlify.com).
