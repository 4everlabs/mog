> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# End a browser session

> Terminates the browser session and releases all associated resources.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/{id}/end
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
  /v1/sessions/{id}/end:
    post:
      summary: End a browser session
      description: Terminates the browser session and releases all associated resources.
      operationId: SessionEnd
      parameters:
        - schema:
            description: Unique session identifier
            example: c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123
            type: string
          in: path
          name: id
          required: true
          description: Unique session identifier
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
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionEndResponse'
      x-codeSamples:
        - lang: JavaScript
          source: >-
            import Stagehand from 'stagehand-sdk';


            const client = new Stagehand({
              browserbaseAPIKey: process.env['BROWSERBASE_API_KEY'], // This is the default and can be omitted
              browserbaseProjectID: process.env['BROWSERBASE_PROJECT_ID'], // This is the default and can be omitted
              modelAPIKey: process.env['MODEL_API_KEY'], // This is the default and can be omitted
            });


            const response = await
            client.sessions.end('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123');


            console.log(response.success);
        - lang: Python
          source: |-
            import os
            from stagehand import Stagehand

            client = Stagehand(
                browserbase_api_key=os.environ.get("BROWSERBASE_API_KEY"),  # This is the default and can be omitted
                browserbase_project_id=os.environ.get("BROWSERBASE_PROJECT_ID"),  # This is the default and can be omitted
                model_api_key=os.environ.get("MODEL_API_KEY"),  # This is the default and can be omitted
            )
            response = client.sessions.end(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
            )
            print(response.success)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.End(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionEndParams{},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Success)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionEndParams;
            import com.browserbase.api.models.sessions.SessionEndResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionEndResponse response = client.sessions().end("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123");
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionEndParams
            import com.browserbase.api.models.sessions.SessionEndResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val response: SessionEndResponse = client.sessions().end("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
            }
        - lang: Ruby
          source: >-
            require "stagehand"


            stagehand = Stagehand::Client.new(
              browserbase_api_key: "My Browserbase API Key",
              browserbase_project_id: "My Browserbase Project ID",
              model_api_key: "My Model API Key"
            )


            response =
            stagehand.sessions.end_("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")


            puts(response)
components:
  schemas:
    SessionEndResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
      required:
        - success
      additionalProperties: false
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
