import qs from "node:querystring";
//#region node_modules/.pnpm/@aws-lite+sqs@0.2.4/node_modules/@aws-lite/sqs/src/incomplete.mjs
var disabled = true;
var docRoot$1 = "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/";
var incomplete_default = {
	AddPermission: {
		disabled,
		awsDoc: docRoot$1 + "API_AddPermission.html"
	},
	CancelMessageMoveTask: {
		disabled,
		awsDoc: docRoot$1 + "API_CancelMessageMoveTask.html"
	},
	ChangeMessageVisibility: {
		disabled,
		awsDoc: docRoot$1 + "API_ChangeMessageVisibility.html"
	},
	ChangeMessageVisibilityBatch: {
		disabled,
		awsDoc: docRoot$1 + "API_ChangeMessageVisibilityBatch.html"
	},
	CreateQueue: {
		disabled,
		awsDoc: docRoot$1 + "API_CreateQueue.html"
	},
	DeleteMessageBatch: {
		disabled,
		awsDoc: docRoot$1 + "API_DeleteMessageBatch.html"
	},
	DeleteQueue: {
		disabled,
		awsDoc: docRoot$1 + "API_DeleteQueue.html"
	},
	GetQueueUrl: {
		disabled,
		awsDoc: docRoot$1 + "API_GetQueueUrl.html"
	},
	ListDeadLetterSourceQueues: {
		disabled,
		awsDoc: docRoot$1 + "API_ListDeadLetterSourceQueues.html"
	},
	ListMessageMoveTasks: {
		disabled,
		awsDoc: docRoot$1 + "API_ListMessageMoveTasks.html"
	},
	ListQueues: {
		disabled,
		awsDoc: docRoot$1 + "API_ListQueues.html"
	},
	ListQueueTags: {
		disabled,
		awsDoc: docRoot$1 + "API_ListQueueTags.html"
	},
	PurgeQueue: {
		disabled,
		awsDoc: docRoot$1 + "API_PurgeQueue.html"
	},
	RemovePermission: {
		disabled,
		awsDoc: docRoot$1 + "API_RemovePermission.html"
	},
	SendMessageBatch: {
		disabled,
		awsDoc: docRoot$1 + "API_SendMessageBatch.html"
	},
	SetQueueAttributes: {
		disabled,
		awsDoc: docRoot$1 + "API_SetQueueAttributes.html"
	},
	StartMessageMoveTask: {
		disabled,
		awsDoc: docRoot$1 + "API_StartMessageMoveTask.html"
	},
	TagQueue: {
		disabled,
		awsDoc: docRoot$1 + "API_TagQueue.html"
	},
	UntagQueue: {
		disabled,
		awsDoc: docRoot$1 + "API_UntagQueue.html"
	}
};
//#endregion
//#region node_modules/.pnpm/@aws-lite+sqs@0.2.4/node_modules/@aws-lite/sqs/src/index.mjs
/**
* Plugin maintained by: @architect
*/
var service = "sqs";
var property = "SQS";
var required = true;
var docRoot = "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/";
var arr = { type: "array" };
var obj = { type: "object" };
var num = { type: "number" };
var str = { type: "string" };
var defaultError = ({ statusCode, headers, error }) => {
	if (error.Error) error = error.Error;
	if (error?.Code) {
		error.name = error.code = error.Code;
		delete error.Code;
	}
	if (error?.__type) {
		const name = error.__type.split("#")[1];
		if (name) error.name = error.code = name;
	}
	if (error && (headers?.["x-amzn-requestid"] || headers?.["x-amzn-RequestId"])) error.requestId = headers["x-amzn-requestid"] || headers?.["x-amzn-RequestId"];
	return {
		statusCode,
		error
	};
};
var headers = (method, additional) => ({
	"X-Amz-Target": `AmazonSQS.${method}`,
	...additional
});
var awsjsonContentType = { "content-type": "application/x-amz-json-1.0" };
var formEncodedContentType = { "content-type": "application/x-www-form-urlencoded" };
var GetQueueAttributes = {
	awsDoc: docRoot + "API_GetQueueAttributes.html",
	validate: {
		QueueUrl: {
			...str,
			required,
			comment: "SQS queue URL to retrieve attribute information from"
		},
		AttributeNames: {
			...arr,
			comment: "List of attribute names (strings) to retrieve"
		}
	},
	request: async (params) => ({
		awsjson: false,
		headers: headers("GetQueueAttributes", awsjsonContentType),
		payload: params
	}),
	response: ({ payload }) => payload,
	error: defaultError
};
var ReceiveMessage = {
	awsDoc: docRoot + "API_ReceiveMessage.html",
	validate: {
		QueueUrl: {
			...str,
			required,
			comment: "SQS queue URL from which messages are received"
		},
		AttributeNames: {
			...arr,
			comment: "List of attribute names (strings) to be returned along with each message"
		},
		MaxNumberOfMessages: {
			...num,
			comment: "Maximum number of messages to return"
		},
		MessageAttributeNames: {
			...arr,
			comment: "The name of the message attribute"
		},
		MessageSystemAttributeNames: {
			...arr,
			comment: "A list of attributes that need to be returned along with each message"
		},
		ReceiveRequestAttemptId: {
			...str,
			comment: "The token used for deduplication of `ReceiveMessage` calls"
		},
		VisibilityTimeout: {
			...num,
			comment: "The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a `ReceiveMessage` request"
		},
		WaitTimeSeconds: {
			...num,
			comment: "The duration (in seconds) for which the call waits for a message to arrive in the queue before returning"
		}
	},
	request: async (params) => ({
		awsjson: false,
		headers: headers("ReceiveMessage", awsjsonContentType),
		payload: params
	}),
	response: ({ payload }) => payload,
	error: defaultError
};
var src_default = {
	name: "@aws-lite/sqs",
	service,
	property,
	methods: {
		SendMessage: {
			awsDoc: docRoot + "API_SendMessage.html",
			validate: {
				MessageBody: {
					...str,
					required,
					comment: "Message to send, from 1b - 256KiB"
				},
				QueueUrl: {
					...str,
					required,
					comment: "SQS queue URL to send the message to"
				},
				DelaySeconds: {
					...num,
					comment: "Seconds, from 0 - 900, to delay a message"
				},
				MessageAttributes: {
					...obj,
					comment: "Message attribute map",
					ref: docRoot + "API_MessageAttributeValue.html"
				},
				MessageDeduplicationId: {
					...str,
					comment: "Ensures request is idempotent; may only be used for FIFO queues"
				},
				MessageGroupId: {
					...str,
					comment: "Tag specifying a specific message group; may only be used for FIFO queues"
				},
				MessageSystemAttributes: {
					...obj,
					comment: "Message system attribute map",
					ref: docRoot + "API_MessageSystemAttributeValue.html"
				}
			},
			request: async (params) => ({
				headers: formEncodedContentType,
				payload: qs.stringify({
					Action: "SendMessage",
					...params
				})
			}),
			response: ({ payload }) => payload.SendMessageResult,
			error: defaultError
		},
		GetQueueAttributes,
		ReceiveMessage,
		DeleteMessage: {
			awsDoc: docRoot + "API_DeleteMessage.html",
			validate: {
				QueueUrl: {
					...str,
					required,
					comment: "SQS queue URL from which messages are deleted"
				},
				ReceiptHandle: {
					...str,
					required,
					comment: "The receipt handle associated with the message to delete"
				}
			},
			request: async (params) => ({
				awsjson: false,
				headers: headers("DeleteMessage", awsjsonContentType),
				payload: params
			}),
			response: ({ payload }) => payload,
			error: defaultError
		},
		...incomplete_default
	}
};
//#endregion
export { src_default as default };

//# sourceMappingURL=src-C_8DPcV-.js.map