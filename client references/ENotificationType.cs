using System;

namespace EFT.Communications
{
	// Token: 0x020016B0 RID: 5808
	public enum ENotificationType
	{
		// Token: 0x0400803E RID: 32830
		[GAttribute19("ping")]
		Ping,
		// Token: 0x0400803F RID: 32831
		[GAttribute19("channel_deleted")]
		ChannelDeleted,
		// Token: 0x04008040 RID: 32832
		[GAttribute19("trader_supply")]
		TraderSupply,
		// Token: 0x04008041 RID: 32833
		[GAttribute19("groupMatchInviteAccept")]
		GroupMatchInviteAccept,
		// Token: 0x04008042 RID: 32834
		[GAttribute19("groupMatchInviteDecline")]
		GroupMatchInviteDecline,
		// Token: 0x04008043 RID: 32835
		[GAttribute19("groupMatchWasRemoved")]
		GroupMatchWasRemoved,
		// Token: 0x04008044 RID: 32836
		[GAttribute19("groupMatchInviteSend")]
		GroupMatchInviteSend,
		// Token: 0x04008045 RID: 32837
		[GAttribute19("groupMatchInviteCancel")]
		GroupMatchInviteCancel,
		// Token: 0x04008046 RID: 32838
		[GAttribute19("groupMatchLeaderChanged")]
		GroupMatchLeaderChanged,
		// Token: 0x04008047 RID: 32839
		[GAttribute19("groupMatchUserLeave")]
		GroupMatchUserLeave,
		// Token: 0x04008048 RID: 32840
		[GAttribute19("groupMaxCountReached")]
		GroupMaxCountReached,
		// Token: 0x04008049 RID: 32841
		[GAttribute19("groupMatchStartGame")]
		GroupMatchStartGame,
		// Token: 0x0400804A RID: 32842
		[GAttribute19("groupMatchUserHasBadVersion")]
		WrongMajorVersion,
		// Token: 0x0400804B RID: 32843
		[GAttribute19("new_message")]
		ChatMessageReceived,
		// Token: 0x0400804C RID: 32844
		[GAttribute19("youAreRemovedFromFriendList")]
		RemovedFromFriendsList,
		// Token: 0x0400804D RID: 32845
		[GAttribute19("friendListNewRequest")]
		FriendsListNewRequest,
		// Token: 0x0400804E RID: 32846
		[GAttribute19("friendListRequestCancel")]
		FriendsListRequestCanceled,
		// Token: 0x0400804F RID: 32847
		[GAttribute19("tournamentWarning")]
		TournamentWarning,
		// Token: 0x04008050 RID: 32848
		[GAttribute19("friendListRequestDecline")]
		FriendsListDecline,
		// Token: 0x04008051 RID: 32849
		[GAttribute19("friendListRequestAccept")]
		FriendsListAccept,
		// Token: 0x04008052 RID: 32850
		[GAttribute19("groupMatchYouWasKicked")]
		YouWasKickedFromDialogue,
		// Token: 0x04008053 RID: 32851
		[GAttribute19("youAreAddToIgnoreList")]
		YouWereAddedToIgnoreList,
		// Token: 0x04008054 RID: 32852
		[GAttribute19("youAreRemoveFromIgnoreList")]
		YouWereRemovedToIgnoreList,
		// Token: 0x04008055 RID: 32853
		RagfairOfferSold,
		// Token: 0x04008056 RID: 32854
		RagfairRatingChange,
		// Token: 0x04008057 RID: 32855
		RagfairNewRating,
		// Token: 0x04008058 RID: 32856
		ForceLogout,
		// Token: 0x04008059 RID: 32857
		InGameBan,
		// Token: 0x0400805A RID: 32858
		InGameUnBan,
		// Token: 0x0400805B RID: 32859
		Hideout,
		// Token: 0x0400805C RID: 32860
		TraderStanding,
		// Token: 0x0400805D RID: 32861
		ProfileLevel,
		// Token: 0x0400805E RID: 32862
		SkillPoints,
		// Token: 0x0400805F RID: 32863
		HideoutAreaLevel,
		// Token: 0x04008060 RID: 32864
		AssortmentUnlockRule,
		// Token: 0x04008061 RID: 32865
		ExamineItems,
		// Token: 0x04008062 RID: 32866
		ExamineAllItems,
		// Token: 0x04008063 RID: 32867
		TraderSalesSum,
		// Token: 0x04008064 RID: 32868
		UnlockTrader,
		// Token: 0x04008065 RID: 32869
		ProfileLockTimer,
		// Token: 0x04008066 RID: 32870
		MasteringSkill,
		// Token: 0x04008067 RID: 32871
		ProfileExperienceDelta,
		// Token: 0x04008068 RID: 32872
		TraderStandingDelta,
		// Token: 0x04008069 RID: 32873
		TraderSalesSumDelta,
		// Token: 0x0400806A RID: 32874
		SkillPointsDelta,
		// Token: 0x0400806B RID: 32875
		MasteringSkillDelta,
		// Token: 0x0400806C RID: 32876
		[GAttribute19("userMatched")]
		UserMatched,
		// Token: 0x0400806D RID: 32877
		[GAttribute19("userMatchOver")]
		UserMatchOver,
		// Token: 0x0400806E RID: 32878
		[GAttribute19("userConfirmed")]
		UserConfirmed
	}
}
