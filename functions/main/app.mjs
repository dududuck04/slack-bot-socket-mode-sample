import Slack from "./slack/index.mjs";
import { executeWbSfn } from "./aws-sdk/sfnExecute.mjs";

/**
 * Slack 의 입력 이벤트를 처리하기 위한 Slack 초기화를 담당.
 *
 * @param {Object} event AWS Lambda 함수 실행시 전달되는 Client 정보 및 Parameter 정보를 제공하는 오브젝트. API Gateway Lambda Proxy를 통해 호출된다. {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format}
 * @param {Object} context AWS Lambda 함수 실행에 대한 다양한 정보를 전달하는 'context' 오브젝트. {@link https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html}
 *
 * @returns {Promise<*>}
 */
async function initSlack(event, context, callback, localMode) {
  const slack = new Slack({
    lambdaEvent: event,
    lambdaContext: context,
    lambdaCallback: callback,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_APP_TOKEN,
    submitHandler: async (wbStepFunctionInputParams) => {
      await executeWbSfn(wbStepFunctionInputParams);
      console.log("DB: \n" + JSON.stringify("Submit 버튼 클릭됨!!", null, 2));
    },
    localMode: localMode,
  });

  return slack.start();
}


async function callStepFunction(event, context, callback) {

    const stepFunctionParamsForDebug = JSON.parse(event.body);
    console.log(`Debug body: \n${JSON.stringify(stepFunctionParamsForDebug)}`)
    await executeWbSfn(stepFunctionParamsForDebug);

    return {
        "statusCode": "200",
        "body": "{\"message\": \"success\"}"
    }
}

// Export an asynchronous function as a Lambda handler
/**
 * Node.JS용 AWS Lambda Handler.
 *
 * @param {Object} event AWS Lambda 함수 실행시 전달되는 Client 정보 및 Parameter 정보를 제공하는 오브젝트. API Gateway Lambda Proxy를 통해 호출된다. {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format}
 * @param {Object} context AWS Lambda 함수 실행에 대한 다양한 정보를 전달하는 'context' 오브젝트. {@link https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html}
 *
 * @returns {Object} object - API Gateway Lambda Proxy Output Format. {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-output-format}
 */
export const lambdaHandler = async (event, context, callback) => {
    try {
        console.log(`EVENT: \n${JSON.stringify(event)}`);
        console.log(`Context: \n${JSON.stringify(context)}`);

        if( event.queryStringParameters && event.queryStringParameters.debug && event.queryStringParameters.debug === "true") {
            return callStepFunction(event, context, callback);
        }
        else {

            // When a Lambda function is triggered, this function will be executed
            const slackResult = await initSlack(event, context, callback, false);
            console.log("slackResult: \n" + JSON.stringify(slackResult, null, 2));
            return slackResult;
        }
    } catch (err) {
        console.log(err);
        throw new Error("Internal server error");
    }
};

export const localHandler = async () => {
    // Basic Information / Signing Secret
    process.env.SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ? process.env.SLACK_SIGNING_SECRET : "";
    // Install App / Bot User OAuth Token
    process.env.SLACK_APP_TOKEN = process.env.SLACK_APP_TOKEN ? process.env.SLACK_APP_TOKEN : "";
    // Basic Informatin / App-Level Tokens
    process.env.SLACK_APP_TOKEN2 = process.env.SLACK_APP_TOKEN2 ? process.env.SLACK_APP_TOKEN2 : "";
    await initSlack(null, null, null, true);

    console.log('⚡️ app is running!');
}

