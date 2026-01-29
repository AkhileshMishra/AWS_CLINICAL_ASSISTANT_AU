// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import uuid4 from 'uuid4';



export function useS3() {
    const uploadKeyPrefix = 'uploads/HealthScribeDemo/';

    const bucketName = import.meta.env.VITE_BUCKET_NAME;
    function getUploadMetadata() {
        return {
            bucket: bucketName,
            key: uploadKeyPrefix + uuid4(),
        };
    }

    return [bucketName, getUploadMetadata] as const;
}
