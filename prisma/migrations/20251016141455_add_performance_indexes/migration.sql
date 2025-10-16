-- CreateIndex
CREATE INDEX "applications_tradespersonId_idx" ON "applications"("tradespersonId");

-- CreateIndex
CREATE INDEX "applications_jobId_status_idx" ON "applications"("jobId", "status");

-- CreateIndex
CREATE INDEX "jobs_customerId_idx" ON "jobs"("customerId");

-- CreateIndex
CREATE INDEX "jobs_status_category_idx" ON "jobs"("status", "category");

-- CreateIndex
CREATE INDEX "jobs_createdAt_idx" ON "jobs"("createdAt");

-- CreateIndex
CREATE INDEX "messages_jobId_senderId_receiverId_idx" ON "messages"("jobId", "senderId", "receiverId");

-- CreateIndex
CREATE INDEX "messages_senderId_createdAt_idx" ON "messages"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_receiverId_createdAt_idx" ON "messages"("receiverId", "createdAt");
