//#region node_modules/.pnpm/@aws-lite+sns@0.0.8/node_modules/@aws-lite/sns/src/incomplete.mjs
var disabled = true;
var docRoot = "https://docs.aws.amazon.com/sns/latest/api/";
var incomplete_default = {
	AddPermission: {
		disabled,
		awsDoc: docRoot + "API_AddPermission.html"
	},
	CheckIfPhoneNumberIsOptedOut: {
		disabled,
		awsDoc: docRoot + "API_CheckIfPhoneNumberIsOptedOut.html"
	},
	ConfirmSubscription: {
		disabled,
		awsDoc: docRoot + "API_ConfirmSubscription.html"
	},
	CreatePlatformApplication: {
		disabled,
		awsDoc: docRoot + "API_CreatePlatformApplication.html"
	},
	CreatePlatformEndpoint: {
		disabled,
		awsDoc: docRoot + "API_CreatePlatformEndpoint.html"
	},
	CreateSMSSandboxPhoneNumber: {
		disabled,
		awsDoc: docRoot + "API_CreateSMSSandboxPhoneNumber.html"
	},
	CreateTopic: {
		disabled,
		awsDoc: docRoot + "API_CreateTopic.html"
	},
	DeleteEndpoint: {
		disabled,
		awsDoc: docRoot + "API_DeleteEndpoint.html"
	},
	DeletePlatformApplication: {
		disabled,
		awsDoc: docRoot + "API_DeletePlatformApplication.html"
	},
	DeleteSMSSandboxPhoneNumber: {
		disabled,
		awsDoc: docRoot + "API_DeleteSMSSandboxPhoneNumber.html"
	},
	DeleteTopic: {
		disabled,
		awsDoc: docRoot + "API_DeleteTopic.html"
	},
	GetDataProtectionPolicy: {
		disabled,
		awsDoc: docRoot + "API_GetDataProtectionPolicy.html"
	},
	GetEndpointAttributes: {
		disabled,
		awsDoc: docRoot + "API_GetEndpointAttributes.html"
	},
	GetPlatformApplicationAttributes: {
		disabled,
		awsDoc: docRoot + "API_GetPlatformApplicationAttributes.html"
	},
	GetSMSAttributes: {
		disabled,
		awsDoc: docRoot + "API_GetSMSAttributes.html"
	},
	GetSMSSandboxAccountStatus: {
		disabled,
		awsDoc: docRoot + "API_GetSMSSandboxAccountStatus.html"
	},
	GetSubscriptionAttributes: {
		disabled,
		awsDoc: docRoot + "API_GetSubscriptionAttributes.html"
	},
	GetTopicAttributes: {
		disabled,
		awsDoc: docRoot + "API_GetTopicAttributes.html"
	},
	ListEndpointsByPlatformApplication: {
		disabled,
		awsDoc: docRoot + "API_ListEndpointsByPlatformApplication.html"
	},
	ListOriginationNumbers: {
		disabled,
		awsDoc: docRoot + "API_ListOriginationNumbers.html"
	},
	ListPhoneNumbersOptedOut: {
		disabled,
		awsDoc: docRoot + "API_ListPhoneNumbersOptedOut.html"
	},
	ListPlatformApplications: {
		disabled,
		awsDoc: docRoot + "API_ListPlatformApplications.html"
	},
	ListSMSSandboxPhoneNumbers: {
		disabled,
		awsDoc: docRoot + "API_ListSMSSandboxPhoneNumbers.html"
	},
	ListSubscriptions: {
		disabled,
		awsDoc: docRoot + "API_ListSubscriptions.html"
	},
	ListSubscriptionsByTopic: {
		disabled,
		awsDoc: docRoot + "API_ListSubscriptionsByTopic.html"
	},
	ListTagsForResource: {
		disabled,
		awsDoc: docRoot + "API_ListTagsForResource.html"
	},
	ListTopics: {
		disabled,
		awsDoc: docRoot + "API_ListTopics.html"
	},
	OptInPhoneNumber: {
		disabled,
		awsDoc: docRoot + "API_OptInPhoneNumber.html"
	},
	PublishBatch: {
		disabled,
		awsDoc: docRoot + "API_PublishBatch.html"
	},
	PutDataProtectionPolicy: {
		disabled,
		awsDoc: docRoot + "API_PutDataProtectionPolicy.html"
	},
	RemovePermission: {
		disabled,
		awsDoc: docRoot + "API_RemovePermission.html"
	},
	SetEndpointAttributes: {
		disabled,
		awsDoc: docRoot + "API_SetEndpointAttributes.html"
	},
	SetPlatformApplicationAttributes: {
		disabled,
		awsDoc: docRoot + "API_SetPlatformApplicationAttributes.html"
	},
	SetSMSAttributes: {
		disabled,
		awsDoc: docRoot + "API_SetSMSAttributes.html"
	},
	SetSubscriptionAttributes: {
		disabled,
		awsDoc: docRoot + "API_SetSubscriptionAttributes.html"
	},
	SetTopicAttributes: {
		disabled,
		awsDoc: docRoot + "API_SetTopicAttributes.html"
	},
	Subscribe: {
		disabled,
		awsDoc: docRoot + "API_Subscribe.html"
	},
	TagResource: {
		disabled,
		awsDoc: docRoot + "API_TagResource.html"
	},
	Unsubscribe: {
		disabled,
		awsDoc: docRoot + "API_Unsubscribe.html"
	},
	UntagResource: {
		disabled,
		awsDoc: docRoot + "API_UntagResource.html"
	},
	VerifySMSSandboxPhoneNumber: {
		disabled,
		awsDoc: docRoot + "API_VerifySMSSandboxPhoneNumber.html"
	}
};
//#endregion
//#region node_modules/.pnpm/@aws-lite+sns@0.0.8/node_modules/@aws-lite/sns/src/index.mjs
/**
* Plugin maintained by: @architect
*/
var service = "sns";
var property = "SNS";
var required = true;
var str = { type: "string" };
var defaultResponse = ({ payload }) => {
	let response = payload;
	delete response.xmlns;
	return response;
};
var defaultError = ({ statusCode, headers, error }) => {
	if (error.Error) error = error.Error;
	if (error?.Code) {
		error.name = error.code = error.Code;
		delete error.Code;
	}
	if (error && (headers?.["x-amzn-requestid"] || headers?.["x-amzn-RequestId"])) error.requestId = headers["x-amzn-requestid"] || headers?.["x-amzn-RequestId"];
	return {
		statusCode,
		error
	};
};
var src_default = {
	name: "@aws-lite/sns",
	service,
	property,
	methods: {
		Publish: {
			awsDoc: "https://docs.aws.amazon.com/sns/latest/api/API_Publish.html",
			validate: {
				Message: {
					...str,
					required,
					comment: "Message payload to send"
				},
				MessageAttributes: {
					...str,
					comment: "String to MessageAttributeValue object map"
				},
				MessageDeduplicationId: {
					...str,
					comment: "Ensures request is idempotent; may only be used for FIFO topics"
				},
				MessageGroupId: {
					...str,
					comment: "Tag specifying a specific message group; may only be used for FIFO topics"
				},
				MessageStructure: {
					...str,
					comment: "May be set to `json` publish JSON payloads"
				},
				PhoneNumber: {
					...str,
					comment: "SMS recipient phone number in E.164 format; if not specified, you must specify `TargetArn` or `TargetArn`"
				},
				Subject: {
					...str,
					comment: "Email subject line"
				},
				TargetArn: {
					...str,
					comment: "If not specified, you must specify `PhoneNumber` or `TopicArn`"
				},
				TopicArn: {
					...str,
					comment: "ARN of the the topic to publish to; if not specified, you must specify `PhoneNumber` or `TargetArn`"
				}
			},
			request: async (params) => ({ query: {
				Action: "Publish",
				...params
			} }),
			response: defaultResponse,
			error: defaultError
		},
		...incomplete_default
	}
};
//#endregion
export { src_default as default };

//# sourceMappingURL=src-D4GYjC6x.js.map