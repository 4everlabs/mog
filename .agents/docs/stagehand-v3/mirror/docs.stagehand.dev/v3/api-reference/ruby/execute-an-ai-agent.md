> ## Documentation Index
> Fetch the complete documentation index at: https://docs.stagehand.dev/llms.txt
> Use this file to discover all available pages before exploring further.

# Execute an AI agent

> Runs an autonomous AI agent that can perform complex multi-step browser tasks.



## OpenAPI

````yaml https://app.stainless.com/api/spec/documented/stagehand/openapi.documented.yml post /v1/sessions/{id}/agentExecute
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
  /v1/sessions/{id}/agentExecute:
    post:
      summary: Execute an AI agent
      description: >-
        Runs an autonomous AI agent that can perform complex multi-step browser
        tasks.
      operationId: SessionAgentExecute
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
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AgentExecuteRequest'
        required: true
      responses:
        '200':
          description: Default Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AgentExecuteResponse'
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
            client.sessions.execute('c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123', {
              agentConfig: {},
              executeOptions: {
                instruction: "Log in with username 'demo' and password 'test123', then navigate to settings",
              },
            });


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
            for session in client.sessions.execute(
                id="c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
                agent_config={},
                execute_options={
                    "instruction": "Log in with username 'demo' and password 'test123', then navigate to settings"
                },
            ):
              print(session)
        - lang: Go
          source: "package main\n\nimport (\n\t\"context\"\n\t\"fmt\"\n\n\t\"github.com/browserbase/stagehand-go\"\n\t\"github.com/browserbase/stagehand-go/option\"\n)\n\nfunc main() {\n\tclient := stagehand.NewClient(\n\t\toption.WithBrowserbaseAPIKey(\"My Browserbase API Key\"),\n\t\toption.WithBrowserbaseProjectID(\"My Browserbase Project ID\"),\n\t\toption.WithModelAPIKey(\"My Model API Key\"),\n\t)\n\tresponse, err := client.Sessions.Execute(\n\t\tcontext.TODO(),\n\t\t\"c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123\",\n\t\tstagehand.SessionExecuteParams{\n\t\t\tAgentConfig: stagehand.SessionExecuteParamsAgentConfig{},\n\t\t\tExecuteOptions: stagehand.SessionExecuteParamsExecuteOptions{\n\t\t\t\tInstruction: \"Log in with username 'demo' and password 'test123', then navigate to settings\",\n\t\t\t},\n\t\t},\n\t)\n\tif err != nil {\n\t\tpanic(err.Error())\n\t}\n\tfmt.Printf(\"%+v\\n\", response.Data)\n}\n"
        - lang: Java
          source: |-
            package com.browserbase.api.example;

            import com.browserbase.api.client.StagehandClient;
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient;
            import com.browserbase.api.models.sessions.SessionExecuteParams;
            import com.browserbase.api.models.sessions.SessionExecuteResponse;

            public final class Main {
                private Main() {}

                public static void main(String[] args) {
                    StagehandClient client = StagehandOkHttpClient.fromEnv();

                    SessionExecuteParams params = SessionExecuteParams.builder()
                        .id("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
                        .agentConfig(SessionExecuteParams.AgentConfig.builder().build())
                        .executeOptions(SessionExecuteParams.ExecuteOptions.builder()
                            .instruction("Log in with username 'demo' and password 'test123', then navigate to settings")
                            .build())
                        .build();
                    SessionExecuteResponse response = client.sessions().execute(params);
                }
            }
        - lang: Kotlin
          source: |-
            package com.browserbase.api.example

            import com.browserbase.api.client.StagehandClient
            import com.browserbase.api.client.okhttp.StagehandOkHttpClient
            import com.browserbase.api.models.sessions.SessionExecuteParams
            import com.browserbase.api.models.sessions.SessionExecuteResponse

            fun main() {
                val client: StagehandClient = StagehandOkHttpClient.fromEnv()

                val params: SessionExecuteParams = SessionExecuteParams.builder()
                    .id("c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123")
                    .agentConfig(SessionExecuteParams.AgentConfig.builder().build())
                    .executeOptions(SessionExecuteParams.ExecuteOptions.builder()
                        .instruction("Log in with username 'demo' and password 'test123', then navigate to settings")
                        .build())
                    .build()
                val response: SessionExecuteResponse = client.sessions().execute(params)
            }
        - lang: Ruby
          source: |-
            require "stagehand"

            stagehand = Stagehand::Client.new(
              browserbase_api_key: "My Browserbase API Key",
              browserbase_project_id: "My Browserbase Project ID",
              model_api_key: "My Model API Key"
            )

            response = stagehand.sessions.execute(
              "c4dbf3a9-9a58-4b22-8a1c-9f20f9f9e123",
              agent_config: {},
              execute_options: {instruction: "Log in with username 'demo' and password 'test123', then navigate to settings"}
            )

            puts(response)
components:
  schemas:
    AgentExecuteRequest:
      type: object
      properties:
        agentConfig:
          $ref: '#/components/schemas/AgentConfig'
        executeOptions:
          $ref: '#/components/schemas/AgentExecuteOptions'
        frameId:
          description: Target frame ID for the agent
          anyOf:
            - type: string
            - type: 'null'
        streamResponse:
          description: Whether to stream the response via SSE
          example: true
          type: boolean
        shouldCache:
          description: >-
            If true, the server captures a cache entry and returns it to the
            client
          type: boolean
      required:
        - agentConfig
        - executeOptions
    AgentExecuteResponse:
      type: object
      properties:
        success:
          description: Indicates whether the request was successful
          type: boolean
        data:
          $ref: '#/components/schemas/AgentExecuteResultOutput'
      required:
        - success
        - data
      additionalProperties: false
    AgentConfig:
      type: object
      properties:
        provider:
          description: >-
            AI provider for the agent (legacy, use model: openai/gpt-5-nano
            instead)
          example: openai
          type: string
          enum:
            - openai
            - anthropic
            - google
            - microsoft
            - bedrock
        model:
          description: >-
            Model configuration object or model name string (e.g.,
            'openai/gpt-5-nano')
          anyOf:
            - $ref: '#/components/schemas/ModelConfig'
            - type: string
        systemPrompt:
          description: Custom system prompt for the agent
          type: string
        cua:
          description: >-
            Deprecated. Use mode: 'cua' instead. If both are provided, mode
            takes precedence.
          example: true
          type: boolean
        mode:
          description: Tool mode for the agent (dom, hybrid, cua). If set, overrides cua.
          example: cua
          type: string
          enum:
            - dom
            - hybrid
            - cua
        executionModel:
          description: >-
            Model configuration object or model name string (e.g.,
            'openai/gpt-5-nano') for tool execution (observe/act calls within
            agent tools). If not specified, inherits from the main model
            configuration.
          anyOf:
            - $ref: '#/components/schemas/ModelConfig'
            - type: string
    AgentExecuteOptions:
      type: object
      properties:
        instruction:
          description: Natural language instruction for the agent
          example: >-
            Log in with username 'demo' and password 'test123', then navigate to
            settings
          type: string
        maxSteps:
          description: Maximum number of steps the agent can take
          example: 20
          type: number
        highlightCursor:
          description: Whether to visually highlight the cursor during execution
          example: true
          type: boolean
        useSearch:
          description: >-
            Whether to enable the web search tool powered by Browserbase Search
            API
          example: true
          type: boolean
        toolTimeout:
          description: Timeout in milliseconds for each agent tool call
          example: 30000
          type: number
      required:
        - instruction
    AgentExecuteResultOutput:
      type: object
      properties:
        result:
          $ref: '#/components/schemas/AgentResultDataOutput'
        cacheEntry:
          $ref: '#/components/schemas/AgentCacheEntryOutput'
      required:
        - result
      additionalProperties: false
    ModelConfig:
      $ref: '#/components/schemas/ModelConfigObject'
    AgentResultDataOutput:
      type: object
      properties:
        success:
          description: Whether the agent completed successfully
          example: true
          type: boolean
        message:
          description: Summary of what the agent accomplished
          example: Successfully logged in and navigated to dashboard
          type: string
        actions:
          type: array
          items:
            $ref: '#/components/schemas/AgentAction'
        completed:
          description: Whether the agent finished its task
          example: true
          type: boolean
        metadata:
          type: object
          propertyNames:
            type: string
          additionalProperties: {}
        usage:
          $ref: '#/components/schemas/AgentUsageOutput'
      required:
        - success
        - message
        - actions
        - completed
      additionalProperties: false
    AgentCacheEntryOutput:
      type: object
      properties:
        cacheKey:
          description: >-
            Opaque cache identifier computed from instruction, URL, options, and
            config
          type: string
        entry:
          description: Serialized cache entry that can be written to disk
      required:
        - cacheKey
        - entry
      additionalProperties: false
    ModelConfigObject:
      type: object
      properties:
        provider:
          description: AI provider for the model (or provide a baseURL endpoint instead)
          example: openai
          type: string
          enum:
            - openai
            - anthropic
            - google
            - microsoft
            - bedrock
        modelName:
          description: Model name string with provider prefix (e.g., 'openai/gpt-5-nano')
          example: openai/gpt-5-nano
          type: string
        apiKey:
          description: API key for the model provider
          example: sk-some-openai-api-key
          type: string
        baseURL:
          description: Base URL for the model provider
          example: https://api.openai.com/v1
          type: string
          format: uri
      required:
        - modelName
    AgentAction:
      type: object
      properties:
        type:
          description: Type of action taken
          example: click
          type: string
        reasoning:
          description: Agent's reasoning for taking this action
          type: string
        taskCompleted:
          type: boolean
        action:
          type: string
        timeMs:
          description: Time taken for this action in ms
          type: number
        pageText:
          type: string
        pageUrl:
          type: string
        instruction:
          type: string
      required:
        - type
      additionalProperties: {}
    AgentUsageOutput:
      type: object
      properties:
        input_tokens:
          example: 1500
          type: number
        output_tokens:
          example: 250
          type: number
        reasoning_tokens:
          type: number
        cached_input_tokens:
          type: number
        inference_time_ms:
          example: 2500
          type: number
      required:
        - input_tokens
        - output_tokens
        - inference_time_ms
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
